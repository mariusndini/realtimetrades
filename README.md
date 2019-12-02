# Real Time Trades (Bitcoin - USD pair)
This demo collects real time Bitcoin-USD pair trades from Binance API (https://github.com/binance-exchange/binance-official-api-docs/blob/master/web-socket-streams.md#trade-streams). This stream is available to anyone interested in collecting this information. This information is made available through a HTTP web-socket. 

This demo consists of the following puzzle pieces 

<b>Node-js</b> The demo runs on node-js on a VM to connect and collect data from Bitcoin streaming API. Once messages come through the websocket they are then sent to AWS Kinesis. Essentially the stream flows from the source to an S3 bucket for <i>Snowpipe</i> to ingest.

<b>AWS Kinesis</b> Data from node-js to AWS Kinesis one message at a time. Every 5mbs or 300 seconds, which ever comes first, then data is saved to S3. 

<b>Snowpipe</b> Once the data hits the S3 bucket Snowpipe ingests this dataset into Snowflake. On average this happens every two seconds. This depends on when the SQS message alerts Snowflake that new data is ready to be ingested.

<b>Snowflake</b> Snowflake ingests and houses all data that will later be ready for processing.

![img](https://github.com/mariusndini/img/blob/master/cryptopath.png)


## Raw Data Values
Below is a list of the values we are getting from the API. This data is incoming in real time as people make trades on the exchange. The values of relevence to us are <b>price (p)</b> since this will be the value we are buying and selling this asset. We also care about tracking when this asset was trade so <b>trade time is important (T)</b>, trade id is also important since we may have 2 or 3 trades within any given second trade_id will give us the correct order
```
{
  "e": "trade",     // Event type
  "E": 123456789,   // Event time
  "s": "BNBBTC",    // Symbol
  "t": 12345,       // Trade ID
  "p": "0.001",     // Price
  "q": "100",       // Quantity
  "b": 88,          // Buyer order ID
  "a": 50,          // Seller order ID
  "T": 123456785,   // Trade time
  "m": true,        // Is the buyer the market maker?
  "M": true         // Ignore
}
(Courtesy of https://github.com/binance-exchange/binance-official-api-docs/blob/master/web-socket-streams.md#trade-streams)
```

The data above comes in JSON format and we use the view & query below to convert the data into rows & columns for easier processing.

```
create or replace view trades as
  select 
    TRADES:trade.a AS SELLER_ORDER_ID
  , TRADES:trade.b AS BUYER_ORDER_ID
  , TRADES:trade.e::STRING AS EVENT_TYPE
  , TRADES:trade.m AS MARKET_MAKER
  , TRADES:trade.p::DOUBLE AS PRICE
  , TRADES:trade.q::DOUBLE AS QUANTIITY
  , PRICE * QUANTIITY AS DOLLAR
  , TRADES:trade.s::STRING AS SYMBOL
  , TRADES:trade.t AS TRADE_ID
  , to_timestamp_ntz((TRADES:trade.E/1000)::INTEGER) as EVENT_TIME
  , to_timestamp_ntz((TRADES:trade.T/1000)::INTEGER) as TRADE_TIME

  from CRYPTOTRADES
  order by TRADE_TIME desc ;
```

## Candle Stick Charts
We can take the data above and do some additional processing and aggregation to get candle stick charts off the raw data above. We can also define the time frame for which we want the candle stick. The logic below is straight forward since <b>open</b> is the value of the price at the start of the timeframe. <b>high</b> is the max price during a particular time frame and <b>low</b> is the minimum. Finally the <b>close</b> is the last value of the time frame. 

```
select distinct date_trunc("minutes", trade_time) as TIME
, last_value(price) over (partition by TIME order by trade_time, trade_id DESC) as OPEN
, max(price) over (partition by TIME order by TIME DESC) as HIGH
, min(price) over (partition by TIME order by TIME DESC) as LOW
, first_value(price) over (partition by TIME order by trade_time, trade_id DESC) as CLOSE

from trades
order by 1 desc ;
```

### Data in Candle Sticks
Each candle stick represents a particular time frames (minute, hour, day etc) worth of data about an asset. The information is the <b>open price</b> which is the first trade purchase of the asset and the <b>close price</b> being last trade value. 

These two numbers make the <b>trade body</b> and if the close price is higher then the open price the candle stick is positive meaning the asset was more valuable at close time then it was at open time and vice versa is true. 

The two other numbers are the <b>high</b> and <b>low</b> being the maximum value and lowest value someone purchased this asset for during that time frame.

![img](https://github.com/mariusndini/img/blob/master/bearish_bullish_candlesticks.png)

## Bitcoin Candles
We can graph data points of our Bitcoin price chart from the view in a google sheet to better see what is happening (https://docs.google.com/spreadsheets/d/11KEiHFvYb61668XHOUCdcPDpIAiuvFjlLk4YazRJc2k/edit#gid=0)

A quick chart shows the data below. Although not live data it would not be challenging to create a report which would be fed with live data from Snowflake database. The caveat being there will be a 5 to 10 minute in the trade times. 

![img](https://github.com/mariusndini/img/blob/master/BTC_Candles.png)

# About This Data
This data set is streamed in real-time as trades are happening on the trading platform. The through put is lagged by two bottle necks. One AWS Kinesis which is currently set to batch every 300 seconds or 5mbs (which ever comes first). Since the data set is relatively small in size it will almost always wait 300 seconds (5 minutes). The second is Snowpipe which will wait until AWS SQS will send a message to Snowflake to ingest the data and this is on average about 120 seconds but usually less.

Providing some context around this data set every second there could be 1 to 20 trades given the traffic. Every hour there could be any where between ~10k and ~20k trades on this particular crypto-pair. The table below highlights trading volumes for the a particular day.
<table class="table table-bordered table-hover table-condensed">
<thead><tr><th title="Field #1">Time</th>
<th title="Field #2">Trades</th>
</tr></thead>
<tbody><tr>
<td>12/2/2019  8:00:00 PM</td>
<td align="right">11715</td>
</tr>
<tr>
<td>12/2/2019  7:00:00 PM</td>
<td align="right">8587</td>
</tr>
<tr>
<td>12/2/2019  6:00:00 PM</td>
<td align="right">9330</td>
</tr>
<tr>
<td>12/2/2019  5:00:00 PM</td>
<td align="right">12641</td>
</tr>
<tr>
<td>12/2/2019  4:00:00 PM</td>
<td align="right">12736</td>
</tr>
<tr>
<td>12/2/2019  3:00:00 PM</td>
<td align="right">14204</td>
</tr>
<tr>
<td>12/2/2019  2:00:00 PM</td>
<td align="right">21142</td>
</tr>
<tr>
<td>12/2/2019  1:00:00 PM</td>
<td align="right">10346</td>
</tr>
<tr>
<td>12/2/2019  12:00:00 PM</td>
<td align="right">15830</td>
</tr>
<tr>
<td>12/2/2019  11:00:00 AM</td>
<td align="right">11543</td>
</tr>
<tr>
<td>12/2/2019  10:00:00 AM</td>
<td align="right">19343</td>
</tr>
<tr>
<td>12/2/2019  9:00:00 AM</td>
<td align="right">18643</td>
</tr>
<tr>
<td>12/2/2019  8:00:00 AM</td>
<td align="right">15124</td>
</tr>
<tr>
<td>12/2/2019  7:00:00 AM</td>
<td align="right">12697</td>
</tr>
<tr>
<td>12/2/2019  6:00:00 AM</td>
<td align="right">30403</td>
</tr>
<tr>
<td>12/2/2019  5:00:00 AM</td>
<td align="right">17256</td>
</tr>
<tr>
<td>12/2/2019  4:00:00 AM</td>
<td align="right">13160</td>
</tr>
<tr>
<td>12/2/2019  3:00:00 AM</td>
<td align="right">10947</td>
</tr>
<tr>
<td>12/2/2019  2:00:00 AM</td>
<td align="right">9346</td>
</tr>
<tr>
<td>12/2/2019  1:00:00 AM</td>
<td align="right">10648</td>
</tr>
<tr>
<td>12/2/2019  12:00:00 AM</td>
<td align="right">12375</td>
</tr>
<tr>
<td>12/1/2019  11:00:00 PM</td>
<td align="right">14081</td>
</tr>
<tr>
<td>12/1/2019  10:00:00 PM</td>
<td align="right">17254</td>
</tr>
<tr>
<td>12/1/2019  9:00:00 PM</td>
<td align="right">14893</td>
</tr>
</tbody></table>











    







