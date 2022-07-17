var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const qrcode = require('qrcode-terminal');
var aguid = require('aguid');
const cors = require("cors");
var dotenv = require("dotenv");
const axios = require('axios');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

dotenv.config();

var indexRouter = require('./routes/index');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

var clientLocationMap = {};
var clientDataMap = {};

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.initialize();

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('AUTHENTICATED');
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.on('message', async (message) => {
  var clientContact = message.from
  if (message.type === 'chat') {
    if (message.body) {
      const media = MessageMedia.fromFilePath('./public/images/ambulet-logo.jpeg');
      var encodedMsg="Welcome%20to%20Ambulet%20Emergency%20Services.%0A%0APlease%20share%20your%20location%20via%20WhatsApp%20location%20share.%0A%0AThank%20you."
      client.sendMessage(clientContact, media, {
        caption: decodeURI(encodedMsg),
      });
      clientDataMap[clientContact] = message.body
    }
  }

  if (message.type === 'location') {
    var t1 = clientContact.slice(2)
    var t2 = t1.slice(0, -5);
    var finalContact = parseInt(t2)

    const contact = await message.getContact();

    var initiateHelpData = {
      "requestId": aguid(),
      "name": contact.pushname,
      "contact": finalContact,
      "message": clientDataMap[clientContact],
      "locationData": JSON.parse(JSON.stringify(message.location))
    }
    console.log(initiateHelpData);
    var url= "https://uhi-hackathon-provider-server.vercel.app/eua/sos"

    axios.post(url, initiateHelpData,
      {
          headers: {
              'Content-Type': 'application/json'
          }
      }
  )
      .then((response) => {
          var data = response.data;
          console.log("DATA SENT");
      },
          (error) => {
              console.log(error)
              
          }
      );
    clientLocationMap[clientContact] = initiateHelpData
    client.sendMessage(clientContact, 'Help is on the way, our executive shall call you shortly.');
  }
});

//endpoint to send messages back to user
app.post('/message/send', (req, res) => {

  var arr=req.body.number;
  var num1= arr[0];
  var num2=arr[1];
  var clientContact1=`91${num1}@c.us`;
  var clientContact2=`91${num2}@c.us`;
  console.log(clientContact1)
  console.log(clientContact2)
    const media1 = MessageMedia.fromFilePath('./public/images/ambulet-logo.jpeg');
    var encodedMsg="Your%20ambulance%20is%20on%20its%20way!%0A%0AThese%20are%20the%20details-%0AAmbulance%20Number-%20KA-01-%202001%0APilot%20Name-%20Mr.%20Dhiraj%20Kamble%0APilot%20Number-%208296538385%0AETA-%2012%20minutes%0AOTP-%2012345%0A%0APlease%20share%20this%20OTP%20with%20the%20pilot%20to%20confirm%20your%20Ambulet.%20%0A%0ATeam%20Ambulet."
    client.sendMessage(clientContact1, media1, {
      caption: decodeURI(encodedMsg),
    });

    const media2 = MessageMedia.fromFilePath('./public/images/ambulet-logo.jpeg');
    var encodedMsg="Someone%20needs%20your%20help!%0A%0AThese%20are%20the%20details-%0AName-%20Shiwani%20Rawat%0AContact%20number-%208557859939%0APickup%20Address-%20Survey%20No.%2058%2C%20Devarabisanahalli%2C%20Bellandur%2C%20Bengaluru%2C%20Karnataka%20560103%0ADrop%20Address-%20Sakra%20Hospital%2C%20Bellandur%0AType%20of%20Ambulance-%20Basic%20Life%20Support%0APrice-%20Rs.%204200%0AOTP-%2012345%0A%0ATeam%20Ambulet"
    client.sendMessage(clientContact2, media2, {
      caption: decodeURI(encodedMsg),
    });
    res.status(200).json(
      {
          message: "message sent to end user and Driver"
      }
  );
})

app.use('/', indexRouter);

module.exports = app;
