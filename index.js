const Binance = require('binance-api-node').default;
var fs = require('fs');
const kafka = require('kafka-node'); 
const config = require('./config.json');
const snowflake = require('./snowflakeWrapper.js');
var dbConn = null;

const WebSocket = require('ws');
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');




//Consumer = kafka.Consumer;
client = new kafka.KafkaClient({kafkaHost: '35.225.38.201:9092'});
//consumer = new Consumer( client, [{ topic: 'TutorialTopic'}], {autoCommit: false} );

//consumer.on('message', function (message) {
//    console.log(message);
//});




HighLevelProducer = kafka.HighLevelProducer;
producer = new HighLevelProducer(client);

producer.on('ready', function () {
    ws.on('message', function incoming(trades) {
        var payloads = [{topic: 'btcusdt', messages: trades } ];
        producer.send(payloads, function (err, data) {
            console.log(data);
        });
        //console.log(trades);
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







