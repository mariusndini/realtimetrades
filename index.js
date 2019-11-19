const Binance = require('binance-api-node').default;
var fs = require('fs');
const AWS = require('aws-sdk');
const kafka = require('kafka-node'); 
const config = require('./config.json');
const snowflake = require('./snowflakeWrapper.js');
var dbConn = null;

const WebSocket = require('ws');
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

console.log(config.kinesis);

var kinesis = new AWS.Kinesis(config.kinesis);


var trx = [];

ws.on('message', function incoming(trades) {
    var trade = JSON.parse(trades);
    trx.push(trade.p);
    console.log( sma(trx, 100) );

    kinesis.putRecord({
        Data: trades,
        StreamName: 'crypto-btc-stream',
        PartitionKey: 'partition - 1'

    }, function(err, data) {
        console.log(data);
        if (err) {
            console.error(err);
        }
    });



});



/*
//WEBSOCKET
var savedData = [];
snowflake.connect()
.then((dbConnection)=>{
    dbConn = dbConnection;
    return;
}).then(()=>{
    

})






//Periodcially save data to the database
setInterval(function() {
//    savedData = [];

    insertSQL = 'insert into \"EXCHANGE\".\"PUBLIC\".\"CRYPTOTRADES\"(select parse_json (column1) from values(\'[' + (savedData) + ']\'))';
    
    if(savedData.length > 0){
        return snowflake.runSQL(dbConn, insertSQL).then((data)=>{
            console.log(Date.now(), data);
            savedData = [];

        });
    }

}, 1000);
*/







