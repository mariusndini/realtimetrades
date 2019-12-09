var brain = require('brain.js');
//const config = require('./../../config.json');
const savePng = require('save-svg-as-png');
const snowflake = require('./snowflakeWrapper.js');
const fs = require('fs');

var norm = 7800;

var dbConn;
var world = {};

module.exports = {
    run: function(){
        return snowflake.connect()
        .then((dbConnection)=>{
            dbConn = dbConnection;
            return dbConn;

        }).then((con)=>{
            var SQL = ` select open, high, low, close
                        from btc_candle_minutes
                        order by time desc
                        limit 4320;`; //1440 for full day

            return snowflake.runSQL(dbConn, SQL);
        }).then((data)=>{
            world.trainData = data;

            var SQL = ` select ops, id
                from trainOps
                where train = true
                order by date desc
                limit 1;
                `; //1440 for full day

            return snowflake.runSQL(dbConn, SQL);

        }).then((trainOps)=>{
            world.id = trainOps[0].ID;

            var data = world.trainData;
            norm = trainOps[0].OPS.norm;

            var normalize = function ( step ){
                var n = data[0].LOW;
                return {
                    open: step.OPEN / norm, 
                    high: step.HIGH / norm, 
                    low: step.LOW / norm, 
                    close: step.CLOSE / norm
                }
            }

            var raw = data.map( normalize );

            //var training = [ raw.slice(0,100), raw.slice(100,200), raw.slice(200, 300), raw.slice(300,400), raw.slice(400,500), raw.slice(500,600), raw.slice(600,700),
            //               raw.slice(600,700), raw.slice(700,800), raw.slice(900, 1000), raw.slice(1000,1100), raw.slice(1100,1200), raw.slice(1200,1300), raw.slice(1300,1440) ];

            world.res = trainModel( [raw], trainOps[0].OPS );

            var SQL = ` insert into models (date, model, svg, log, ops) 
                        select current_timestamp , 
                        PARSE_JSON('` + world.res.model + `'), '` + world.res.svg + `', 
                        PARSE_JSON('` + JSON.stringify(world.res.trainlog) + `'), `
                        + `PARSE_JSON('` + JSON.stringify(world.res.trainOps) + `');`;
            return snowflake.runSQL(dbConn, SQL);


        }).then((dbres)=>{
            console.log(dbres);
            var SQL = ` update trainOps
                        set train = false
                        where id = ` +world.id+ ` ;`;
                        
            return snowflake.runSQL(dbConn, SQL);


        }).then((dbres)=>{
            console.log(dbres);
            console.log('Saved --> SNFLK');
            return(world.id);
        })
    }
}

function trainModel(trainingData, ops){
    console.log(ops);

    const net = new brain.recurrent.LSTMTimeStep( { inputSize:4, hiddenLayers: ops.hiddenLayers, outputSize: 4} )
    var res = {};
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

    var trainErr = [];
    var trainOps = ops;

    res.trainOps = trainOps;

    trainOps.log = (error) => {
            //console.log(error);
            trainErr.push( { iter: error.split(',')[0].split(':')[1], 
                              err: error.split(',')[1].split(':')[1] });
    };

    net.train(training, trainOps);

    res.trainlog = trainErr;

    res.model =  JSON.stringify( net.toJSON() );

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
    res.svg = brain.utilities.toSVG(net, svgoptions) ;

    return res;


}

