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


function getMessagesCallback(allBatches, beginningOfMessages, prevMessageID, channelID){
    var opts = {"channelID": channelID }
    if (!beginningOfMessages) opts.before = prevMessageID;                     
     
    return new Promise(function(resolve) {
        bot.getMessages(opts, function (error, messageArray) {                
            var batch = [];                      
            for(var i = 0; i < messageArray.length; i++){    
                // Store the last message border for the next loop
                if (i == messageArray.length-1) prevMessageID = messageArray[i]['id'];                         
                if (messageArray[i]['author']['id'] === FREDDY_ID) {
                    console.log(messageArray[i]['content'])
                    batch.push(messageArray[i]['content'])               
                } 
            }                       
            beginningOfMessages = false;      
            
            if(batch.length == 0){                
                resolve('');
            }
            else {            
                allBatches.push(batch); 
                // KEY MISTAKE: RESOLVE ALWAYS ACCEPTS ONE ARGUMENT!!!!!!!!!            
                // Resolve( previous message ID);                
                resolve(prevMessageID);
            }
        });       
    }).then(function (prevMessageID){
        if (prevMessageID != ''){                     
            return getMessagesCallback(allBatches, beginningOfMessages, prevMessageID, channelID);
        } 
        return allBatches;
    });
 
}

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`    
    var allBatches = [];
    var beginningOfMessages = true;
    var prevMessageID = '';

    var allMessages = getMessagesCallback(allBatches, beginningOfMessages, prevMessageID, channelID);
    Promise.resolve(allMessages).then(function (value){
        var formattedMessageLog = "";
        for (var i = 0; i < value.length; i++){
            for(var j = 0; j < value[i].length; j++){
                formattedMessageLog += value[i][j] + "\n";
            }
            formattedMessageLog += "\n";
        }
        fs.writeFileSync("messages.log", formattedMessageLog);
    })
    
});