const train = require('./train.js');
const guess = require('./guess.js');


console.log("~ RUNNING ~");
var world = {};

function trainRunner(){
    train.run()
    .then((id)=>{
        console.log( "done - " + id );
        world.id = id;
        return guess.run(id);

    }).then(()=>{
        return trainRunner();
    
    }).catch((err)=>{
        //console.log("ERR: " + err);
        wait(1000);
        console.log("waiting");
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








