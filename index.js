const Binance = require('binance-api-node').default;
var fs = require('fs');
const AWS = require('aws-sdk');
const kafka = require('kafka-node');
const config = require('./config.json');
const snowflake = require('./snowflakeWrapper.js');
var dbConn = null;
var sma = require('sma');
const WebSocket = require('ws');
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

console.log(config.kinesis);

var kinesis = new AWS.Firehose(config.kinesis);
var trx = [];

ws.on('message', function incoming(trades) {
    var trade = JSON.parse(trades);
    //console.log(trade);
   // trx.push(trade.p);
    console.log( sma(trx, 100) );
    /*
    kinesis.putRecord({
        Record:{Data: trades},
        DeliveryStreamName: 'crypto-btc-stream'
    }, function(err, data) {
        console.log(data);
        if (err) {
            console.error(err);
        }
    });
    */
});
