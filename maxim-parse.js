var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var fs = require('fs');
// Configure logger settings

const MAX_ID = "163475101046538240";
const FREDDY_ID = "265678340692770816";

logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`    
    var stockMessages = [];
    var beginningOfMessages = true;
    var prevMessageID = '';

    do {
        var batch = [];
        var opts = {"channelID": channelID, "limit": 100}
        if (!beginningOfMessages){
            opts.before = prevMessageID;            
        }
        bot.getMessages(opts, function (error, messageArray) {                
            for(var i = 0; i < messageArray.length; i++){    
                // Store the last message border for the next loop
                if (i == messageArray.length-1) prevMessageID = messageArray[i]['id'];                 
                if (messageArray[i]['author']['id'] === FREDDY_ID){  
                    console.log(messageArray[i]['content']);              
                    batch.push(messageArray[i]['content']);
                }
            }            
        });
        stockMessages.push(batch);
        console.log("THIS IS BATCH TESTTTTTTT_____ " + batch + " " + batch.length);
        beginningOfMessages = false;
    }
    while(batch.length != 0);

    // fs.writeFileSync("messages.log", stockMessages.toString());
    // console.log(stockMessages);

    if (message.substring(0, 8) == '@mnhn329') {
        bot.sendMessage({
            to: channelID,
            message: 'afk max here :^)'
        });
        // var args = message.substring(1).split(' ');
        // var cmd = args[0];
       
        // args = args.splice(1);
        // switch(cmd) {
        //     // !ping
        //     case 'ping':
        //         bot.sendMessage({
        //             to: channelID,
        //             message: 'Pong!'
        //         });
        //     break;
        //     // Just add any case commands if you want to..
        //  }
     }
});