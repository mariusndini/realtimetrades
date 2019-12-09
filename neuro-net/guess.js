var brain = require('brain.js');
const fs = require('fs');
const snowflake = require('./snowflakeWrapper.js');

var norm = 7800;

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
            var SQL = ` select open, high, low, close
                        from btc_candle_minutes
                        order by time desc
                        limit 100;`; //1440 for full day

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
                        where id = `+world.id+`
                        limit 1;`;

            return snowflake.runSQL(dbConn, SQL)

        }).then((data)=>{

            const net = new brain.recurrent.LSTMTimeStep();
            net.fromJSON( data[0].MODEL );
            world.model = data[0].MODEL;

            var denormalize = function ( step ){
                var now = parseInt(now) + (1000 * 60);
                return {
                    open: step.open * norm, 
                    high: step.high * norm, 
                    low: step.low * norm, 
                    close: step.close * norm
                }
            }

            var output = net.forecast( [ world.input ], 1440 ).map( denormalize );
            output.now = new Date().getTime();
            console.log(output);

            var SQL = ` insert into guesses (date, output, model) 
            select current_timestamp , 
            PARSE_JSON('` + JSON.stringify(output) + `'), 
            PARSE_JSON('`+ JSON.stringify(world.model) +`')`; //1440 for full day

            return snowflake.runSQL(dbConn, SQL)

        }).then((data)=>{
            console.log(data);
            
        })
    }//end function
}// exports
