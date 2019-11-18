var snowflake = require('snowflake-sdk');
const config = require('./config.json');

var connection = snowflake.createConnection(config.snowflake);

module.exports = {
    connect: function(){
        return new Promise((resolve, reject) =>{
            connection.connect(function(err, conn) {
                if (err) {
                    if(err.code == 405502){
                        resolve(connection);
                    }
                    console.log(JSON.stringify(err) );
                    reject(err);
                } else {
                    resolve (conn);
                }
            });
        })

    },

    runSQL: function(dbConn, SQL){
        return new Promise((resolve, reject) =>{
            var snowflakeQuery = {
                sqlText: SQL,
                complete: function(err, stmt, rows){
                    if(err){
                        reject(err);
                    }
                    resolve(rows);
                }
            }
            
            dbConn.execute(snowflakeQuery);
        })  
    },

    disconnect: function(){
        return new Promise((resolve, reject)=>{
            connection.destroy(function(err, conn) {
                if (err) {
                    reject(0)
                }
                resolve(1);
            });
        })
    }

}




