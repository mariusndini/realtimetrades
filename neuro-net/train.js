var brain = require('brain.js');
//const config = require('./../../config.json');
const savePng = require('save-svg-as-png');
const snowflake = require('./snowflakeWrapper.js');
const fs = require('fs');


var dbConn;
return snowflake.connect()
.then((dbConnection)=>{
    dbConn = dbConnection;
    return dbConn;

}).then((con)=>{
    var SQL = ` select open, high, low, close
                from btc_candle_minutes
                order by time desc
                limit 1440;`; //1440 for full day

    return snowflake.runSQL(dbConn, SQL)

}).then((data)=>{

    var normalize = function ( step ){
        var n = data[0].LOW;
        return {
            open: step.OPEN /7400, 
            high: step.HIGH /7400, 
            low: step.LOW /7400, 
            close: step.CLOSE /7400
        }
    }

    var raw = data.map( normalize );

    var training = [ raw.slice(0,100), raw.slice(100,200), raw.slice(200, 300), raw.slice(300,400), raw.slice(400,500), raw.slice(500,600) , raw.slice(600,700),
                     raw.slice(600,700), raw.slice(700,800), raw.slice(900, 1000), raw.slice(1000,1100), raw.slice(1100,1200), raw.slice(1200,1300) , raw.slice(1300,1440) ];

    trainModel(training);

    return;

})




function trainModel(trainingData){
    const net = new brain.recurrent.LSTMTimeStep( { inputSize:4, hiddenLayers:[8, 8],outputSize: 4} )

    //Training data set
    var training = trainingData;
    /*
    var trainOptions = {
        // Defaults values --> expected validation
        iterations: 10, // the maximum times to iterate the training data --> number greater than 0
        errorThresh: 0.005, // the acceptable error percentage from training data --> number between 0 and 1
        log: false, // true to use console.log, when a function is supplied it is used --> Either true or a function
        logPeriod: 10, // iterations between logging out --> number greater than 0
        learningRate: 0.3, // scales with delta to effect training rate --> number between 0 and 1
        momentum: 0.1, // scales with next layer's change value --> number between 0 and 1
        callback: null, // a periodic call back that can be triggered while training --> null or function
        callbackPeriod: 10, // the number of iterations through the training data between callback calls --> number greater than 0
        timeout: Infinity, // the max number of milliseconds to train for --> number greater than 0
    };
    */

    net.train(training, {
        learningRate: 0.004,
        errorThresh: 0.018,
        log: (error) => console.log(error),
        logPeriod: 10

    })

    //write model

    console.log( JSON.stringify( net.toJSON()));

    /*
    fs.writeFile('ml.json', JSON.stringify( net.toJSON()), (err) => {
        if (err) throw err;
        console.log('ML saved');

    });
*/

    //SAVE SVG OPTIONS
    const svgoptions ={
        fontSize : "12px",
        width : 600,
        height : 400,
        radius : 6,
        line : {width:0.5, color:"rgba(0,0,0,1)" },
        inputs : {color:"rgba(0,127,0,0.6)", labels:["Open", "High", "Low", "Close"] },
        hidden : {color:"rgba(255,127,80,0.6)"},
        outputs : {color:"rgba(100,149,237,0.6)" }
    }

    //write svg
    console.log( brain.utilities.toSVG(net, svgoptions) );
    
    /*
    fs.writeFile('ml.svg', brain.utilities.toSVG(net, svgoptions), (err) => {
        if (err) throw err;
        console.log('SVG saved');

    });
    */
}

