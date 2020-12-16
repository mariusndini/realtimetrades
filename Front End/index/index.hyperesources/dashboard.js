//load dashboard
function loadDashboard(){
    getLatestPricesHr();
    getLatestPricesMn();
    getVolumeMnt();
    getVolumeHrly();
    get24hrStats();
    $('#dataasof').html(new Date().toLocaleTimeString());

}

//Get streaming data - real time trades from platform
var ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

ws.onopen = ()=>{
    $('#dataasof').html(new Date().toLocaleTimeString());
}

var cnt = 0;
ws.onmessage = (t)=>{
    var data  = JSON.parse(t.data);
    $('#rawJSON').html( t.data );
    cnt = cnt + 1;

    $('#pricehistory') // select table tbody to add data to table
    .prepend('<tr />') // prepend table row
    .children('tr:first') // select row we just created
    .append(`<td>${data.s}</td> <td>${new Date(data.T).toLocaleTimeString()}</td> <td>${data.p}</td> <td>${data.q}</td> <td>$${(data.q * data.p).toFixed(2)}</td>`)

    //do all calculations
    $('#tradeCount').html( (parseInt($('#tradeCount').html()) + 1) );
    $('#streamqty').html( (parseFloat($('#streamqty').html()) + parseFloat(data.q)).toFixed(6) );
    $('#moneySpend').html( ((parseFloat($('#moneySpend').html()) + parseFloat(data.q * data.p)).toFixed(2)) );    
    $('#dollaraverage').html( (parseFloat($('#moneySpend').html()) / parseInt($('#tradeCount').html())).toFixed(2) );    
     

    if(parseFloat($('#newPrice').html()) > parseFloat(data.p)){
        $('#newPrice').css('color','red');
    }else{
        $('#newPrice').css('color','green');
    }
    $('#newPrice').html( parseFloat(data.p).toFixed(2) );

};


//getlatestprices
function getLatestPricesHr(){
    var sql = `select distinct date_trunc("hours", trade_time) as TIME
                    , last_value(price) over (partition by TIME order by trade_time, trade_id DESC) as OPEN
                    , max(price) over (partition by TIME order by TIME DESC) as HIGH
                    , min(price) over (partition by TIME order by TIME DESC) as LOW
                    , first_value(price) over (partition by TIME order by trade_time, trade_id DESC) as CLOSE
                from trades
                where trade_time >= dateadd(day, -7, current_timestamp)
                order by 1 desc
                limit 168`; // 168 hours = 7 days

	runSQL( sql , function (resp){
        var data = resp.body;
        
		var x=[], close=[], high=[], low=[], open=[];		
		for(i = data.length-1; i >= 0; i--){
			x.push(data[i].TIME);
			close.push(data[i].CLOSE);
			high.push(data[i].HIGH);
			low.push(data[i].LOW);
			open.push(data[i].OPEN);
		}
		drawCandleStick('currentpriceshour', x, close, high, low, open, 'BTC-USDT Hourly (7 Days)');
    
    });
}//end function


//getlatestprices
function getLatestPricesMn(){
    var sql = `select distinct date_trunc("minutes", trade_time) as TIME
                 , last_value(price) over (partition by TIME order by trade_time, trade_id DESC) as OPEN
                 , max(price) over (partition by TIME order by TIME DESC) as HIGH
                 , min(price) over (partition by TIME order by TIME DESC) as LOW
                 , first_value(price) over (partition by TIME order by trade_time, trade_id DESC) as CLOSE
                from trades
                where trade_time >= dateadd(day, -1, current_timestamp)
                order by 1 desc
                limit 1440`; // 1440 minutes = 24 hours
			  
	runSQL( sql , function (resp){
		var data = resp.body;
		
		var x=[], close=[], high=[], low=[], open=[];

		for(i = data.length-1; i >= 0; i--){
			x.push(data[i].TIME.split(' ')[1].split('.')[0]);
			close.push(data[i].CLOSE);
			high.push(data[i].HIGH);
			low.push(data[i].LOW);
			open.push(data[i].OPEN);
		}
		drawCandleStick('currentpricesmin', x, close, high, low, open, 'BTC-USDT Minute (24hrs)');
    
    });
}//end function


//getlatestprices
function getVolumeMnt(){
    var sql = `select distinct date_trunc("minute", trade_time) as TIME
                , sum(QUANTIITY) as volume
                , avg(price) as volumeprice
                from trades
                where trade_time >= dateadd(day, -1, current_timestamp)
                group by TIME order by TIME desc
                limit 1440; `; // 1440 minutes = 24 hours
			  
	runSQL( sql , function (resp){
		var data = resp.body;    
        var chartdata = [[], [], []];

        for(i=0; i < data.length; i++){
            chartdata[0].push(data[i].TIME);
            chartdata[1].push(data[i].VOLUME);
            chartdata[2].push(data[i].VOLUMEPRICE);
        }

        var trace1 = {
            x: chartdata[0], y: chartdata[1], name: 'yaxis Volume', type: 'bar'
        };

        var trace2 = {
            x: chartdata[0], y: chartdata[2], name: 'yaxis2 Price', yaxis: 'y2', type: 'line'
        };
          
        var data = [trace1, trace2];
       
        var layout = {
            dragmode: 'zoom',  margin: {r: 50, t: 50, b: 100, l: 50}, title: 'BTC-USDT Volume Minute (24 hr)', showlegend: false, 
            yaxis: {title: 'Trade Volume', autorange: true,  domain: [0, 1],  type: 'linear'},
            yaxis2: {title: 'Avg Price', autorange: true,  domain: [0, 1],  type: 'linear', overlaying:'y', side:'right'}        
        };
    
        Plotly.newPlot('volumechartmin', data, layout);

    });
}//end function

//getlatestprices
function getVolumeHrly(){
    var sql = `select distinct date_trunc("hours", trade_time) as TIME
                , sum(QUANTIITY) as volume
                , avg(price) as volumeprice
                
                from trades
                where trade_time >= dateadd(day, -7, current_timestamp)
                group by TIME order by TIME desc
                limit 168;`; // 1440 minutes = 24 hours
			  
	runSQL( sql , function (resp){
		var data = resp.body;    
        var chartdata = [[], [], []];

        for(i=0; i < data.length; i++){
            chartdata[0].push(data[i].TIME);
            chartdata[1].push(data[i].VOLUME);
            chartdata[2].push(data[i].VOLUMEPRICE);
        }

        var trace1 = {
            x: chartdata[0],
            y: chartdata[1],
            name: 'yaxis Volume',
            type: 'bar'
        };

        var trace2 = {
            x: chartdata[0],
            y: chartdata[2],
            name: 'yaxis2 Price',
            yaxis: 'y2',
            type: 'line'
        };
          
        var data = [trace1, trace2];
        
        var layout = {
            dragmode: 'zoom',
            margin: {r: 50, t: 50, b: 100, l: 50},
            title: 'BTC-USDT Volume Hourly (7 Day)',
            showlegend: false, 
            yaxis: {title: 'Trade Volume', autorange: true,  domain: [0, 1],  type: 'linear'},
            yaxis2: {title: 'Avg Price', autorange: true,  domain: [0, 1],  type: 'linear', overlaying:'y', side:'right'}        
        };
    
        Plotly.newPlot('volumecharthour', data, layout);

    });
}//end function


//get last days worth of stats
function get24hrStats(){
    var sql = `select sum(QUANTIITY) as volume 
                    ,min(price) as minprice
                    ,max(price) as maxprice
                    ,sum(dollar) as totalprice
                    ,count(*) as trades
                from trades
                where trade_time >= DATEADD(Day ,-1, current_timestamp)
                limit 1440 `; // 1440 minutes = 24 hours
			  
	runSQL( sql , function (resp){
		var data = resp.body[0];
        $('#daylow').html(data.MINPRICE);
        $('#dayhigh').html(data.MAXPRICE);
        $('#dayvol').html( parseFloat(data.TOTALPRICE).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,') );
        $('#daytradetot').html( parseFloat(data.TRADES).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')  );
        $('#daytotalbtc').html( parseFloat(data.VOLUME).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')  );
    });
}//end function







