use database exchange;
use warehouse EXCHANGE_WH;
use role accountadmin;

create or replace secure view BTC_CANDLE_MINUTES as
  select distinct date_trunc("minutes", trade_time) as TIME
  , last_value(price) over (partition by TIME order by trade_time, trade_id DESC) as OPEN
  , max(price) over (partition by TIME order by TIME DESC) as HIGH
  , min(price) over (partition by TIME order by TIME DESC) as LOW
  , first_value(price) over (partition by TIME order by trade_time, trade_id DESC) as CLOSE

  from trades
  order by 1 desc
;


select time, open, high, low, close, min(open), min(close)
from BTC_CANDLE_HOURS
group by 1, 2, 3, 4, 5
order by time desc
;

create or replace table models(
    date timestampltz,
    model variant,
    svg string,
    log variant,
    ops variant
);

create or replace table trainOps(
    date timestampltz,
    id int,
    ops variant,
    train boolean
);

create or replace table guesses(
    date timestampltz,
    output variant,
    model variant
);

insert into trainOps (date, id, ops, train)
select current_timestamp, 
trainid.nextval,
PARSE_JSON('{
    learningRate: 0.007,
    errorThresh: 0.03,
    iterations: 50,
    logPeriod: 10,
    hiddenLayers:[8, 4, 8],
    norm: 7800
}'), true
;


select *
from trainOps
order by date desc
;

select *
from trainOps
where id = 22
limit 1
;


select *, hash(model)
,(select count(*) from models) as total
,CONVERT_TIMEZONE('America/New_York', date) as EST 
          
from models
order by date desc
;

/*
SHOWS EVERYTHING
Input of all things
*/
select *
from guesses g
join  models m on  hash(g.model) = hash(m.model)
join trainOps t on hash(t.ops) = hash(m.ops) 
order by m.date desc
;
  




