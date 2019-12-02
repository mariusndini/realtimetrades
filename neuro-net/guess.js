var brain = require('brain.js');
const fs = require('fs');


const net = new brain.recurrent.LSTM()

fs.readFile('ml.json', {encoding: 'utf-8'}, (err, data) => {

    net.fromJSON(JSON.parse(data) )
    const output = net.run( [7738.37, 7740.33, 7735.06, 7735.73] );
    console.log(output);
    
    
    

})

