var brain = require('brain.js');
//const config = require('./../../config.json');
const savePng = require('save-svg-as-png');
const snowflake = require('./snowflakeWrapper.js');
const fs = require('fs');

var norm = 7800.0;

var dbConn;
var world = {};
var returndata = {};

module.exports = {
    run: function(){
        return snowflake.connect()
        .then((dbConnection)=>{
            dbConn = dbConnection;
            returndata.start = new Date();
            return dbConn;

        }).then((con)=>{
            var SQL = ` select * from(select open, high, low, close, time
                        from btc_candle_minutes
                        order by time desc
                        limit 11520) order by time asc;`; //1440 for full day - use the last 3 dails to train model

            return snowflake.runSQL(dbConn, SQL);
        }).then((data)=>{
            world.trainData = data;
            var SQL = ` select ops, id
                from trainOps
                where train = true
                order by date asc
                limit 1; `; //Get the next model to train

            return snowflake.runSQL(dbConn, SQL);

        }).then((trainOps)=>{
            world.id = trainOps[0].ID;
            world.trainops = trainOps;

            var data = world.trainData;
            norm = trainOps[0].OPS.norm;

            returndata.email = trainOps[0].OPS.email;
            returndata.identifier = trainOps[0].OPS.identifier;

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

            var training = [];

            var i,j,temparray=[],chunk = 5;
            for (i=0,j=raw.length; i<j; i+=chunk) {
                temparray = raw.slice(i, i+chunk);
                training.push(temparray);
            }

            world.res = trainModel( training, trainOps[0].OPS );

            var SQL = ` insert into models (date, model, svg, log, ops) 
                        select current_timestamp , 
                        PARSE_JSON('` + world.res.model + `'), '` + world.res.svg + `', 
                        PARSE_JSON('` + JSON.stringify(world.res.trainlog) + `'), `
                        + `PARSE_JSON('` + JSON.stringify(world.res.trainOps) + `');`;
            return snowflake.runSQL(dbConn, SQL);

        }).then((dbres)=>{
            console.log('-- TRAIN -- ');
            console.log(dbres);
            var SQL = ` update trainOps
                        set train = false
                        where id = ` +world.id+ ` ;`;
                        
            return snowflake.runSQL(dbConn, SQL);

        }).then((dbres)=>{
            console.log(dbres);
            console.log('Saved --> SNFLK');
            returndata.end = new Date();
            returndata.id = world.id;
            return( returndata );
        })
    }
}

function trainModel(trainingData, ops){
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
    console.log(ops);

    const net = new brain.recurrent.LSTMTimeStep( { inputSize:4, hiddenLayers: ops.hiddenLayers, outputSize: 4, timeout: 300000} )
    var res = {};
    //Training data set
    var training = trainingData;


    var trainErr = [];
    var trainOps = ops;

    res.trainOps = trainOps;

    trainOps.log = (error) => {
            trainErr.push( { iter: error.split(',')[0].split(':')[1], 
                              err: error.split(',')[1].split(':')[1] });
    };

    net.train(training, trainOps);

    res.trainlog = trainErr;

    res.model =  JSON.stringify( net.toJSON() );

    //SAVE SVG OPTIONS
    const svgoptions ={
        fontSize : "16px",
        width : 600,
        height : 400,
        radius : 8,
        line : {width:0.5, color:"rgba(0,0,0,1)" },
        inputs : {color:"rgba(0,127,0,0.6)", labels:["Open", "High", "Low", "Close"] },
        hidden : {color:"rgba(255,127,80,0.6)"},
        outputs : {color:"rgba(100,149,237,0.6)" }
    }

    //write svg
    res.svg = brain.utilities.toSVG(net, svgoptions) ;

    return res;


}

