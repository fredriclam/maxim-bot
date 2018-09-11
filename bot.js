var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var fs = require('fs');

// Maxim data
const MAX_ID = "163475101046538240";
const FREDDY_ID = "265678340692770816";
// Default quip
defaultMessage = 'Maxim afk :maximwhatsthis:';

// Configure logger settings
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

// Flag to check for timer
bot.isTimerOn = false;
// Default learning target
bot.learningTargetId = MAX_ID;

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
    bot.setPresence({
      game:{
      	name: "for mnhn329" // "Hide and Seek with "
      }
    })
    // Read chat history
    asyncParseToLog("215694187977375746", bot.learningTargetId);
    
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // Ignore self messages
    if (userID == bot.id){
      logger.info('Own message detected! Ignoring.')
      return null;
    }
    // Log message to console
    logger.info(message);
  
    // Pick quip for bot
    let quipList;
    botMessage = defaultMessage;
<<<<<<< HEAD
    fs.readFile( __dirname + '/maxim-padding.txt', (err, data) => {
      if (err) throw err;
      quipList = data.toString().split('\n');

      fs.readFile( __dirname + '/messages.log', function (err, data) {
        if (err) throw err;
        quipList = quipList.concat(data.toString().split('\n'));
        quipListFiltered = quipList.filter(quip => quip.length > 0 && quip.charAt(0) != '!')
        botMessage = quipListFiltered[Math.floor(quipListFiltered.length * Math.random())] + ' <:maxsnuzyen:484989053129719808>';
      });
=======
    fs.readFile( __dirname + '/messages.log', function (err, data) {
      if (err) throw err;
      quipList = data.toString().split('\n');
      quipListFiltered = quipList.filter(quip => quip.length > 0 && quip.charAt(0) != '!')
      botMessage = quipListFiltered[Math.floor(quipListFiltered.length * Math.random())] + ' <:maxsnuzyen:484989053129719808>';
>>>>>>> master
    });

    let msg = message.toLowerCase();
    // Capture ! commands
    if (msg.substring(0, 1) == '!') {
      let args = msg.substring(1).split(' ');
      let cmd = args[0];
      // logger.info(args);
      switch(cmd) {
        case 'learn':
          // Extract largest number, whether or not enclosed by <@ ... >
          let re = new RegExp(/\D*(\d+)/);
          extractedId = re.exec(args[1]);
          // Id validity check and logic
          if (!(extractedId  === null)){
            newLearningTargetId = extractedId[1];
            // Update server's user list
            bot.getAllUsers((err) => { if (err) logger.warn(err); } );
            // Accept new learning target if user exists
            if (bot.users[newLearningTargetId] !== undefined){
              bot.learningTargetId = newLearningTargetId
              logger.info('New learning target: ' + bot.users[newLearningTargetId])
              bot.setPresence({
                game:{
                	name: "for " + bot.users[newLearningTargetId].username
                }
              })
              bot.sendMessage({
                to: channelID,
                message: 'Now following <@' + newLearningTargetId + '> <:maximwhatsthis:484993112729583618>'
              });
            }
            else{
              logger.warn('Invalid learning target selected')
              bot.sendMessage({
                to: channelID,
                message: "<@" + userID + "> Wait, who's that? Tag 'em"
              });
            }
          }
          else {
            bot.sendMessage({
              to: channelID,
              message: 'Technically, that ID is invalid <:maximwhatsthis:484993112729583618>'
            });
          }
          break;
      }
    }
    else {
      // Capture @mnhn329 messages
      if (msg.includes(MAX_ID) || msg.includes('@mnhn329')) {
        if (!bot.isTimerOn){
          // Start timer and payload if not on
          bot.isTimerOn = true;
          timer = setTimeout (function () {
              // use the message's channel (TextChannel) to send a new message
              bot.sendMessage({
                  to: channelID,
                  message: botMessage
              });
              bot.isTimerOn = false;
          }, 5 * 1000);
          logger.info('Timer started');
        }
      }
      else if (msg.includes(bot.id)){
        bot.sendMessage({
            to: channelID,
            message: "Hi! I'm a bot that simulates @mnhn329. Switch who I simulate with !learn <mention>!"
        });
      }
    }
    // Timer cancel
    if (msg.includes('!maximback') || String(userID) == MAX_ID){
      try{
        clearTimeout(timer);
        logger.info('Timer stopped');
      }
      catch(error){
        logger.info("hehe probably timer didn't exist");
      }
      bot.isTimerOn = false;
    }
});

// Asynchronously parse target user's chat history into log
function asyncParseToLog(channelID, targetUserID){
  // Read chat history
let allBatches = [];
let beginningOfMessages = true;
let prevMessageID = '';
let formattedMessageLog = "";
let allMessages = getMessagesCallback(allBatches, beginningOfMessages, prevMessageID, channelID, targetUserID);
  Promise.resolve(allMessages).then(function (value){
      
      for (let i = 0; i < value.length; i++){
          for(let j = 0; j < value[i].length; j++){
              formattedMessageLog += value[i][j] + "\n";
          }
      }
      fs.writeFileSync("messages.log", formattedMessageLog, (err) => {
        if (err) throw err;
        logger.info('The file has been saved!');
      }); 
    })
      return formattedMessageLog;
}

// Jacky's get messages callback
function getMessagesCallback(allBatches, beginningOfMessages, prevMessageID, channelID, targetUserID){
  let opts = {"channelID": channelID }
    if (!beginningOfMessages) opts.before = prevMessageID;

    return new Promise(function(resolve) {
        bot.getMessages(opts, function (error, messageArray) {
          let batch = [];
            for(let i = 0; i < messageArray.length; i++){
                // Store the last message border for the next loop
                if (i == messageArray.length-1) prevMessageID = messageArray[i]['id'];
                if (messageArray[i]['author']['id'] === targetUserID) {
                    // logger.info(messageArray[i]['content'])
                    batch.push(messageArray[i]['content'])
                }
            }
            beginningOfMessages = false;

            if(messageArray.length == 0){
                resolve('');
            }
            else {
                allBatches.push(batch);
                resolve(prevMessageID);
            }
        });
    }).catch( error => {
      logger.info("Callback struggle: " + error);
    }).then(function (prevMessageID){
        if (prevMessageID != ''){
            return getMessagesCallback(allBatches, beginningOfMessages, prevMessageID, channelID,targetUserID);
        }
        return allBatches;
    });
}
