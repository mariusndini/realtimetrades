const train = require('./train.js');
const guess = require('./guess.js');
const config = require('./../../config.json');
var nodemailer = require('nodemailer');


console.log("~ RUNNING ~");
var world = {};

function trainRunner(){
    train.run()
    .then((data)=>{
        console.log( "train - index - " + data.id );
        world = data;
        return guess.run(data.id);

    }).then(()=>{
        console.log(world);
        return sendMail(world);

    }).then(()=>{
        return trainRunner();
    
    }).catch((err)=>{
        wait(1000);
        console.log("waiting -" + err);
        return trainRunner();
    });    


}

trainRunner();

function wait(ms){
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
      end = new Date().getTime();
   }
}


function sendMail(world){

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: config.mailer
      });
      
    var mailOptions = {
        from: 'snowflaketradingalgo@gmail.com',
        to: world.email,
        subject: 'Model Trained - Complete',
        text: `Model completed training ~ \n
               Start Time: ${world.start} \n
               End Time: ${world.end} \n
               Runtime: ${world.end - world.start}ms \n
               Model ID: ${world.id} \n
               Model Identifier: ${world.identifier}`
    };

    return new Promise((resolve, reject) =>{
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              reject(error);
            } else {
              resolve('Email sent: ' + info.response);
            }
        });
    
    })
    

}//end func











