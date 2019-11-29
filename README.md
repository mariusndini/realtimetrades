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
Each candle stick represents a particular time frames (minute, hour, day etc) worth of data about a security. The information is the <b>open price</b> which is the first trade purchase of the security and the <b>close price</b> being last trade value.

![img](https://github.com/mariusndini/img/blob/master/bearish_bullish_candlesticks.png)






    







