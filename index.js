if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const fetch = require('node-fetch')
const nodemailer = require("nodemailer");

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send({ message: 'Hello WWW!' });
});

const sendMail = async (otsikko, viesti) => {
  
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: "smtp.dreamhost.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.USER, // generated ethereal user
        pass: process.env.PASSWORD, // generated ethereal password
      },
    });
  
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: '"Club App" <clubservice@fairytalemagic.fi>', // sender address
      to: "fairytalemagicltd@gmail.com", // list of receivers
      subject: `${otsikko}`, // Subject line
      text: `${viesti}`, // plain text body
      html: `<b>${viesti}</b>`, // html body
    });
  
    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  
    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  }

let oldValues = {ncount: 0, pncount: 0}
let counter = 1

const checker = () => {
    const currentDate = new Date();
    const timestamp = currentDate.getTime()  

    fetch('https://api.clubapp.fi/notification-status')
        .then(res => res.json())
        .then(json => {
            
            const lnts = (new Date(json['result'].lastNotificationTimestamp)).getTime()+120*60*1000 // timestamp of the last fetched or updated item
            const lpts = (new Date(json['result'].latestProcessedNotificationTimestamp)).getTime()+120*60*1000 //timestamp of the last sent notification
            const nCount = json['result'].notificationsCount // number of total feeds in the db
            const pnCount = json['result'].notificationsCount // number of total notifications that are sent
            var d = new Date(timestamp)
            var dn = new Date(lnts)
            var dp = new Date(lpts)
            
            const delay=1000*60*40  //if no activity within this time frame, send alert
            
            let ago= Math.round((timestamp-lnts)/1000/60)
            let lago= Math.round((timestamp-lpts)/1000/60)
            console.log(`\n\n---------------------------------------------------------------------------------\n\nChecker-ajo käynnistyi ${d}\n\n- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -\n\nEdellisen ajon aikana/Tämän ajon aikana saatu uutisten määrä tietokannassa: ${oldValues['ncount']}/${nCount}\n\nEdellisen ajon aikana/Tämän ajon aikana saatu lähetettyjen herätteiden määrä tietokannassa: ${oldValues['pncount']}/${pnCount}\n\nViimeksi haettu tai päivitetty uutisia:${dn} eli ${ago}min sitten.\n\nViimeksi lähetetty herätteitä:${dp} eli ${lago}min sitten.\n`)
            if (counter == 36) sendMail('Vuorokausiraportti',`\n\n---------------------------------------------------------------------------------\n\nChecker-ajo käynnistyi ${d}\n\n- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -\n\nEdellisen ajon aikana/Tämän ajon aikana saatu uutisten määrä tietokannassa: ${oldValues['ncount']}/${nCount}\n\nEdellisen ajon aikana/Tämän ajon aikana saatu lähetettyjen herätteiden määrä tietokannassa: ${oldValues['pncount']}/${pnCount}\n\nViimeksi haettu tai päivitetty uutisia:${dn} eli ${ago}min sitten.\n\nViimeksi lähetetty herätteitä:${dp} eli ${lago}min sitten.\n`).catch(console.error)
            console.log(`\nCOUNTER: ${counter}\n`)
            if ((timestamp-lnts) >= delay){
              sendMail('VIKATILANNE',`Herätteissä on häiriö. Viimeisen kerran herätteitä on haettu ${ago} min sitten. Virhekoodi A.`).catch(console.error)
              console.log(`A: Herätteissä on häiriö. Viimeisen kerran herätteitä on haettu ${ago}min sitten`)
            }
            else if ((timestamp-lpts) >= delay){  
               sendMail('VIKATILANNE',`Herätteissä on häiriö. Viimeisen kerran push-herätteitä on lähtenyt ${lago} min sitten. Virhekoodi B.`).catch(console.error)
               console.log(`B: Herätteissä on häiriö. Viimeisen kerran push-herätteitä on lähtenyt ${lago}min sitten`)
            }
            else if (nCount <= oldValues['ncount'] && oldValues['ncount'] !== 0){
              sendMail('VIKATILANNE',`Herätteissä on häiriö tai uutisia on poistettu tietokannasta, sillä niitä on saman verran tai vähemmän kuin 40 min sitten. Virhekoodi C.`).catch(console.error)
              console.log(`C: Herätteissä on häiriö tai uutisia on poistettu tietokannasta, sillä niitä on saman verran tai vähemmän kuin 40min sitten.`)
            }
            else if (pnCount == oldValues['pncount'] && oldValues['ncount'] !== 0){
               sendMail('VIKATILANNE',`Herätteissä on häiriö, sillä push herätteitä ei ole lähtenyt 40 minuuttiin, vaikka uutisia on haettu. Virhekoodi D.`).catch(console.error)
               console.log(`D: Herätteissä on häiriö, sillä push herätteitä ei ole lähtenyt 40minuuttiin, vaikka uutisia on haettu.`)
            }
            //console.log(`\n minuutteja: ${ago}`)
            oldValues['ncount']=nCount
            oldValues['pncount']=pnCount
            //console.log(`\n ${oldValues['ncount']} \n ${oldValues['pncount']}`)
            console.log(`\n\n---------------------------------------------------------------------------------\n\n`)
            if (counter == 36) counter = 1
            else counter++
        })
}
app.listen(3333, () => {
  console.log('Application listening on port 3333!');
  setInterval(() =>  {checker()},2400000)
});
