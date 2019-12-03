var brain = require('brain.js');
const fs = require('fs');
const snowflake = require('./snowflakeWrapper.js');


var dbConn;
return snowflake.connect()
.then((dbConnection)=>{
    dbConn = dbConnection;
    return dbConn;
}).then((con)=>{
    var SQL = ` select open, high, low, close
                from btc_candle_minutes
                order by time desc
                limit 100;`; //1440 for full day

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

    var input = data.map( normalize );


    //-------------------------------------------
    const net = new brain.recurrent.LSTMTimeStep()

    return fs.readFile('ml.json', {encoding: 'utf-8'}, (err, data) => {
        var denormalize = function ( step ){
            var n = data[0].LOW;
            return {
                open: step.open *7400, 
                high: step.high *7400, 
                low: step.low *7400, 
                close: step.close *7400
            }
        }


        net.fromJSON(JSON.parse(data) )
        var output = net.forecast( [ input ], 10 ).map( denormalize );
        console.log(output);
        return output;
        
        
    })


}).then((forecast)=>{
    //promise doesnt work as of yet


})


