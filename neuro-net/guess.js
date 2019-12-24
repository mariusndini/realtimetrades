var brain = require('brain.js');
const fs = require('fs');
const snowflake = require('./snowflakeWrapper.js');

var norm = 7800.0;

module.exports = {
    run : function(id){
        var dbConn;
        var world = {}
        world.id = id;

        return snowflake.connect()
        .then((dbConnection)=>{
            dbConn = dbConnection;
            return dbConn;

        }).then((con)=>{
            var SQL = ` select * from (select open, high, low, close, time
                        from btc_candle_minutes
                        order by time desc
                        limit 100) order by time asc;`; //1440 for full day

            return snowflake.runSQL(dbConn, SQL);

        }).then((data)=>{
            
            var normalize = function ( step ){
                var n = data[0].LOW;
                return {
                    open: step.OPEN / norm, 
                    high: step.HIGH / norm, 
                    low: step.LOW / norm, 
                    close: step.CLOSE /norm
                }
            }

            world.input = data.map( normalize );

            var SQL = ` select MODEL
                        from models m join trainOps t on hash(t.ops) = hash(m.ops)
                        where id = ` + world.id +`
                        limit 1;`;

            return snowflake.runSQL(dbConn, SQL)

        }).then((data)=>{
            const net = new brain.recurrent.LSTMTimeStep();
            net.fromJSON( data[0].MODEL );
            world.model = data[0].MODEL;

            var denormalize = function ( step, index ){
                var now = parseInt(now) + (1000 * 60);
                return {
                    open: step.open * norm, 
                    high: step.high * norm, 
                    low: step.low * norm, 
                    close: step.close * norm,
                    t: new Date().getTime() + (1000 * (60 * index))
                }
            }

            var inputData = [];
            /*
            var i,j,temparray=[],chunk = 5;
            for (i=0,j=world.input.length; i<j; i+=chunk) {
                temparray = world.input.slice(i, i+chunk);
                inputData.push(temparray);
            }
            */
            var output = net.forecast( world.input, 10 );
            
            var SQL = ` insert into guesses (date, output, model) 
            select current_timestamp , 
            PARSE_JSON('` + JSON.stringify(output.map( denormalize )) + `'), 
            PARSE_JSON('`+ JSON.stringify(world.model) +`')`; //1440 for full day

            return snowflake.runSQL(dbConn, SQL)

        }).then((data)=>{
            console.log('-- GUESS -- ');
            console.log(data);
            
        })
    }//end function
}// exports
