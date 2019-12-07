# Real Time Trades (Bitcoin - USD pair)
This demo collects real time Bitcoin-USD pair trades from Binance API (https://github.com/binance-exchange/binance-official-api-docs/blob/master/web-socket-streams.md#trade-streams). Tne stream is publically available to anyone interested and made available through a HTTP web-socket. 

This demo consists of the following pieces 

<b>API Stream Collector</b> node-js on a VM to connect and collect data from Bitcoin streaming API. Once messages come through the websocket they are routed to AWS Kinesis. Essentially the stream flows from the source to an S3 bucket for <i>Snowpipe</i> to ingest.

<b>AWS Kinesis</b> Data from node-js to AWS Kinesis one message at a time. Every 5mbs or 300 seconds, which ever comes first, then data is saved to S3. 

<b>Snowpipe</b> Once the data hits the S3 bucket Snowpipe ingests dataset into Snowflake. On average this happens every two minutes.

<b>Snowflake</b> Snowflake ingests & houses data that will later for processed.

![img](https://github.com/mariusndini/img/blob/master/cryptopath.png)

This data set is streamed in real-time as trades are happening on the trading platform. The through put is lagged by two services. The first AWS Kinesis which is currently set to batch every 300 seconds or 5mbs (which ever comes first). Since the data set is relatively small in size it will almost always wait 300 seconds (5 minutes). The second is Snowpipe which will wait until AWS SQS will send a message to Snowflake to ingest the data and this is on average about 120 seconds but usually less. Total lag time between a trade occuring and a decision being made on that action is considered ~7 minutes.


## Raw Data Values
Below is a list of the values from the API. Data is incoming in real time as trades occur on the exchange. The values of relevence are <b>price (p)</b> since this will be the value we are buying and selling this asset. We also care about tracking when this asset was trade so <b>trade time is important (T)</b>, trade id is also important since we may have 2 or 3 trades within any given second <b>trade_id</b> will give us the correct order
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
(https://github.com/binance-exchange/binance-official-api-docs/blob/master/web-socket-streams.md#trade-streams)
```

The data above comes in JSON format and we use the view query below to convert the data into rows & columns for easier processing.

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

## Candle Stick Charts
We can take the data above and do some additional processing and aggregation to get candle stick charts off the raw data above. We can also define the time frame for which we want the candle stick (minute, hour, day). The logic below is:

<b>open</b> is the value of the price at the start of the timeframe. 

<b>high</b> is the max price during a particular time frame

<b>low</b> is the minimum. 

<b>close</b> is the last value of the time frame. 

```
select distinct date_trunc("minutes", trade_time) as TIME
, last_value(price) over (partition by TIME order by trade_time, trade_id DESC) as OPEN
, max(price) over (partition by TIME order by TIME DESC) as HIGH
, min(price) over (partition by TIME order by TIME DESC) as LOW
, first_value(price) over (partition by TIME order by trade_time, trade_id DESC) as CLOSE

from trades
order by 1 desc ;
```
Below are the candle stick values graphed from the above query.

## Bitcoin Candles
Bitcoin price chart from the view in a google sheet (https://docs.google.com/spreadsheets/d/11KEiHFvYb61668XHOUCdcPDpIAiuvFjlLk4YazRJc2k/edit#gid=0)

![img](https://github.com/mariusndini/img/blob/master/BTC_Candles.png)

### Data in Candle Sticks
Each candle stick represents a particular time frames (minute, hour, day etc) worth of data about an asset. The information is the 

<b>open price</b> which is the first trade purchase of the asset 

<b>close price</b> being last trade 

<b>trade body</b> is combosed of the above. if the close price is higher then the open price the candle stick is positive meaning the asset was more valuable at close time then it was at open time and vice versa is true. 

<b>high</b> and <b>low</b> being the maximum value and lowest value someone purchased this asset for during that time frame.

![img](https://github.com/mariusndini/img/blob/master/bearish_bullish_candlesticks.png)

More information (https://en.wikipedia.org/wiki/Candlestick_chart)


# Making Decisions
Making decisions off of this data set could be potentially profitable
```
Will be algo, 100%
will be profitable? Hard to say
```

## Algo
We will train a machine learning algorithm to, potentially, accurately enough predict future values. Machine learning is a deep topic in computer science and beyond the scope of this particular demo. What we will cover is high level proof of concept in the over all big picture.

As this demo is 100% javascript & node.js we will use brain.js (user friendly over Tensorflow.js). The algorithm is a LSTM model (https://en.wikipedia.org/wiki/Long_short-term_memory) because it excels at processing time-series data. This same method exists in Python (https://towardsdatascience.com/predicting-stock-price-with-lstm-13af86a74944) and possibly other languages.  


## Snowflake Data for Training
within the <b>neuro-net</B> folder is the code for <b>train.js</b>, which is where the model training happens. Below logic trains model

Save model graph & trained model to snowflake (JSON & small format).

### Predicting w/ Trained Model
Use trained model to make predictions

Save predictions to Snowflake

Over time compare predictions to real results

Come to conclusion whether model was profitable or unprofitable

```
if profitable : make money 
if unprofitable : Train again --> Until profitable
```

















    







