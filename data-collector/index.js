const AWS = require('aws-sdk');
const config = require('./config.json');

const WebSocket = require('ws');
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

console.log(config.kinesis);

var kinesis = new AWS.Firehose(config.kinesis);

ws.on('message', function incoming(trades) {
    var trade = JSON.parse(trades);
    var rec = {};
    rec.trade = trade;

    kinesis.putRecord({
	Record:{Data: JSON.stringify( rec ) },
        DeliveryStreamName: 'crypto-btc-stream'
    }, function(err, data) {
        if (err) {
            console.error(err);
        }
    });

});//end on message

