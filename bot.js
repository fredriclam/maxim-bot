var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var fs = require('fs');

// Maxim data
const MAX_ID = "163475101046538240";
const FREDDY_ID = "265678340692770816";

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
bot.learningTargetId = FREDDY_ID;

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');

    bot.setPresence( {
      idle_since: null,
      game: "Hide and seek"
    } )
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // Log message to console
    logger.info(message);

    asyncParseToLog(channelID, FREDDY_ID)

    // Pick message COMBAK


    // Capture @mnhn329
    let msg = message.toLowerCase();
    if (msg.includes(MAX_ID) || msg.includes('@mnhn329')) {
      if (!bot.isTimerOn){
        // Start timer and payload if not on
        bot.isTimerOn = true;

        // Set default message
        defaultMessage = 'Maxim afk :maximwhatsthis:';

        // Jacky change message payload // // COMBAK: change botMessage to the next message delivered
        botMessage = defaultMessage;

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

          if (!(extractedId  === null)){
            newLearningTargetId = extractedId[1];
            console.log(newLearningTargetId);
            // Update server list
            bot.getAllUsers((error) => { /* No error handling */ } );
            // Accept new learning target if user exists
            if (bot.users[newLearningTargetId] !== undefined){
              bot.learningTargetId = newLearningTargetId
              logger.info('New learning target: ' + bot.users[newLearningTargetId])
              console.log(bot.users[newLearningTargetId]);

              bot.sendMessage({
                to: channelID,
                message: 'Now following <@' + newLearningTargetId + '>'
              });
            }
            else{
              logger.info('Invalid learning target selected')
              bot.sendMessage({
                to: channelID,
                message: "<@" + userID + "> Wait, who's that?"
              });
            }
          }
          else {
            bot.sendMessage({
              to: channelID,
              message: 'Technically, that ID is invalid :maximwhatsthis:'
            });
          }
          break;
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
  var allBatches = [];
  var beginningOfMessages = true;
  var prevMessageID = '';

  var allMessages = getMessagesCallback(allBatches, beginningOfMessages, prevMessageID, channelID, targetUserID);
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
}

// Jacky's get messages callback
function getMessagesCallback(allBatches, beginningOfMessages, prevMessageID, channelID, targetUserID){
    var opts = {"channelID": channelID }
    if (!beginningOfMessages) opts.before = prevMessageID;

    return new Promise(function(resolve) {
        bot.getMessages(opts, function (error, messageArray) {
            var batch = [];
            for(var i = 0; i < messageArray.length; i++){
                // Store the last message border for the next loop
                if (i == messageArray.length-1) prevMessageID = messageArray[i]['id'];
                if (messageArray[i]['author']['id'] === targetUserID) {
                    // logger.info(messageArray[i]['content'])
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
