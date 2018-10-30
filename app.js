var Discord = require('discord.io');
var {createLogger, format, transports} = require('winston');
var {combine, printf, timestamp} = format;
var auth = require('./auth.json');
var fs = require('fs');

const weeabooChannelId = "215694187977375746"
// Maxim data
const MAX_ID = "163475101046538240";
const FREDDY_ID = "265678340692770816";
// Default quip
let defaultMessage = 'Maxim afk :maximwhatsthis:';
let maxsnuzyenEmoji = '<:maxsnuzyen:489283891807518720>';
let coolstorybobEmoji = '<:coolstoryfred:503693902730100736>'

// Message log file name
messageLogName = 'messages.log'
// Define logger file names
loggerFileName = './logger.log'
errFileName = './err.log'
// Configure logger
// Winston printf
const loggingFormat = printf(info => {
  return `"${info.level}" ${info.timestamp} >>> ${info.message}`;
});


const logger = createLogger({
  format: combine(
    timestamp({
      format: 'MM/DD HH:mm:ss'
    }),
    loggingFormat
  ),
  colorize: true,
  transports: [
    new transports.Console({
      level: 'debug'
    }),
    new transports.File({
      filename: loggerFileName,
      level: 'debug'
    }),
    new transports.File({
      filename: errFileName,
      level: 'error'
    }),
  ],
})

// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true,
});
// Append custom attributes
// String proxy for invoking bot -- TODO
bot.targetPlainString = () => '@mnhn329';
// Message that bot will fire next
bot.nextMessage = defaultMessage;
// Flag to check for timer
bot.isTimerOn = false;
// Default learning target
bot.learningTargetId = MAX_ID;
// Default bank of quips is empty
bot.quipList = [];
// Timer delay (seconds)
bot.secondsDelay = 5 * 1000;
// Lines to output on dump
bot.dumpLength = 5;
// Max dump length
bot.maxDumpLength = 10;
// Next message bot will dump
bot.nextMessage = defaultMessage;


bot.on('ready', function (evt) {
    logger.info(`*** Logged in as: ${bot.username} (id:${bot.id}) ***`);
    // Set presence shown on Discord
    bot.setPresence({
      game:{
      	name: "for mnhn329" // "Hide and Seek with "
      }
    })
    // Read chat history
    asyncParseToLog(weeabooChannelId, bot.learningTargetId);
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // Ignore self messages
    if (userID == bot.id){
      logger.debug('Ignoring own message.')
      return null;
    }
    
    // Log message intercepted from chat
    logger.info("Message detected: " + message);
  
    let msg = message.toLowerCase();
    
    if (msg.substring(0, 1) == '!') { // Capture ! commands
      let args = msg.substring(1).split(' ');
      let cmd = args[0];
      logger.info("Inputs parsed: " + args)
      switch(cmd) {
        case 'learn':
          learnTarget(bot, args[1], channelID);
          break;
        case 'dump':
          console.log(bot.dumpLength)
          logDump(bot, channelID);
          break;
      }
    }
    else { // Capture @mnhn329 messages
      if (msg.includes(bot.learningTargetId) || msg.includes(bot.targetPlainString)) {
        pickQuip(bot);
        delayedMessage(bot);
      }
      else if (msg.includes(bot.id)){
        bot.sendMessage({
            to: channelID,
            message: "Hi! I'm a bot that simulates @mnhn329. Switch who I simulate with !learn <mention>!"
        });
      }
    }

    // Special conditions for canceling timer
    if (msg.includes('!maximback') || String(userID) == bot.learningTargetId){
      try{
        clearTimeout(timer);
        logger.info('Timer stopped.');
      }
      catch(error){
        logger.info("Probably timer didn't exist; following timer stop error was caught: ");
        logger.info(error)
      }
      bot.isTimerOn = false;
    }
});

/**
 * Sends bot.nextMessage after delay given by bot.secondsDelay to channelID
 * @param {Discord.Client} bot 
 * @param {str} channelID
 */
function delayedMessage(bot){
  if (!bot.isTimerOn){
    bot.isTimerOn = true;
    // Set new timer
    bot.timer = setTimeout(function () {
        bot.isTimerOn = false;
        bot.sendMessage({
            to: channelID,
            message: bot.nextMessage
        });        
    }, bot.secondsDelay);
    logger.info('Timer started');
  }
}


/**
 * Dumps log to Discord chat.
 * Uses logger, and fires message to channelID.
 * Uses fs to load logger file asynchronously (Winston logger broken)
 * Uses global __dirname, messageLogName.
 * @param {Discord.Client} bot 
 * @param {str} channelID
 */
function logDump(bot, channelID){
  // Read log and dump
  fs.readFile(`${__dirname}/${loggerFileName}`, function(err, data){
    if (err) logger.error("Error caught reading logger file: " + err.message);
    // Sanitize input
    logString = '```JSON\n' + data.toString().replace("```","")
                            .split('\n').slice(-bot.dumpLength-1,-1)
                            .join('\n```\n```JSON\n') + '```';
    logString = "Debug log (last " + bot.dumpLength + " lines):\n" + logString;
    // Dump to chat
    bot.sendMessage({
      to: channelID,
      message: logString
    }, function(err) {if (err) logger.error("Error dumping logs: " + err.message)})
  })
}

/** 
 * Switches bot to a new target.
 * Sets bot.learningTargetId and presence of bot using bot.setPresence.
 * Uses logger and fires messages to channelID
 * @param {Discord.Client} bot
 * @param {str} target: raw string (second argument of command sent to bot).
 * @param {str} channelID
 */ 
function learnTarget(bot, target, channelID) {
  // Extract largest number, whether or not enclosed by <@ ... >
  let re = new RegExp(/\D*(\d+)/);
  extractedId = re.exec(target);
  logger.info(extractedId + target)
  let msg = {to: channelID}
  if (!(extractedId === null)){
    let newLearningTargetId = extractedId[1];
    // Update server's user list
    bot.getAllUsers((err) => { if (err) logger.error("Error caught in learnTarget: " + err.message); } );
    // Accept new learning target if user exists
    if (bot.users[newLearningTargetId] !== undefined){
      bot.learningTargetId = newLearningTargetId
      bot.setPresence({
        game:{
          name: "for " + bot.users[bot.learningTargetId].username
        }
      })
      // Parse log
      asyncParseToLog(channelID, newLearningTargetId);
      logger.info('New learning target: ' + bot.users[newLearningTargetId].username)
      msg.message = 'Now following <@' + newLearningTargetId + '>... <:maximwhatsthis:484993112729583618>'
    }
    else{
      logger.warn('Invalid learning target selected')
      msg.message = "<@" + userID + "> Wait, who's that? Tag 'em"
    }
  }
  else {
    logger.warn('Unexpected learning target')
    msg.message = 'Technically, that ID is invalid <:maximwhatsthis:484993112729583618>'
  }
  // Fire message
  bot.sendMessage(msg)
}

/** 
 * Pick a quip and load it into bot.nextMessage
 * Uses fs to load file message log file asynchronously.
 * Uses global __dirname, messageLogName.
 * @param {Discord.Client} bot
 */
function pickQuip(bot){
  fs.readFile( `${__dirname}/${messageLogName}`, function (err, data) {
    if (err) logger.error("Error caught reading message log: " + err.message);
    // Read all quips from data
    bot.quipList = data.toString().split('\n');
    // Filter out useless elements and !commands
    quipListFiltered = bot.quipList.filter(quip => quip.length > 0 && quip.charAt(0) != '!')
    // Load bot's next message
    if (quipListFiltered && quipListFiltered.length != 0){
      bot.nextMessage = quipListFiltered[Math.floor(quipListFiltered.length * Math.random())] + ' ' + botEmoji(bot.learningTargetId);
    } 
  });
}

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
		

      fs.writeFile(`${messageLogName}`, formattedMessageLog, (err) => {
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

function botEmoji(id){
	return (id == FREDDY_ID)? coolstorybobEmoji : maxsnuzyenEmoji;
}
