var Discord = require('discord.io');
var {createLogger, format, transports} = require('winston');
var {combine, printf, timestamp} = format;
var auth = require('./auth.json');
var fs = require('fs');
var mongo = require('mongodb');
var cmds = require('./cmds.js');
var config = require('./config.js')

// Use winston.format.printf for configuring logger format
const loggingFormat = printf(info => {
  return `"${info.level}" ${info.timestamp} >>> ${info.message}`;
});
// Create logger
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
      filename: config.loggerFileName,
      level: 'debug'
    })
  ],
})

// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true,
});

// Bot settable propreties
settableProperties = {
  // String proxy for invoking bot -- function should be bound to bot
  targetPlainString: () => bot.users[bot.learningTargetId].username,
  // Message that bot will fire next
  nextMessage: config.defaultMessage,
  // Flag to check for timer
  isTimerOn: false,
  // Default learning target
  learningTargetId: config.maxId,
  // Default bank of quips is empty
  quipList: [],
  // Timer delay (seconds)
  secondsDelay: 5 * 1000,
  // Lines to output on dump
  dumpLength: 5,
  // Max dump length
  maxDumpLength: 10,
  // Interactive debugging
  isInteractive: false
};

// Append custom attributes to bot
for (propKey in settableProperties){
  bot[propKey] = settableProperties[propKey];
}

bot.on('disconnect', function(errMsg, code) {
  logger.error(`Disconnected with error message ${errMsg} and code ${code}`);
});

bot.on('ready', function (evt) {
    logger.info(`*** Logged in as: ${bot.username} (id:${bot.id}) ***`);
    // Set presence shown on Discord
    bot.setPresence({
      game:{
        name: "for mnhn329" // "Hide and Seek with "
      }
    })
    // Read chat history
    asyncParseToLog(config.weeabooChannelId, bot.learningTargetId);
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // Ignore self messages
    if (userID == bot.id){
      logger.debug('Ignoring own message.')
      return null;
    }
    // Abort timer if target user messages
    if(String(userID) == bot.learningTargetId)
      interruptTimer(bot);

    logger.debug("Message detected: " + message);
    let msg = message.toLowerCase();
    // Capture @<user> mentions and vanilla @<user> messages
    if (msg.includes(bot.learningTargetId) || msg.includes('@' + bot.targetPlainString())) {
      pickQuip(bot);
      delayedMessage(bot, channelID);
      return null;
    }
    // Capture bot mentions
    if (msg.includes(bot.id)){
      bot.sendMessage({
          to: channelID,
          message: "Hi! I'm a bot that simulates your MIA homies. Switch who I simulate with !learn <mention>, or !help for help."
      });
    }

    // Capture ! commands
    if (msg.substring(0, 1) == '!') {
      // Split message after '!' token by spaces
      let args = msg.substring(1).split(' ');
      // Parse main command !cmd
      let cmd = args[0];
      // Parse optional flags
      flags = parseFlags(args.slice(1).join(" "));
      // Log total input
      logger.debug(`Inputs parsed: ${args}, with option flags (--x): ${JSON.stringify(flags)}`);
      // Commands API
      cmds.exec(cmd, {
        bot: bot,
        user: user,
        userID: userID,
        channelID: channelID,
        message: message,
        evt: evt,
        args: args,
        logger: logger,
        flags: flags
      })
    }
    else if (bot.isInteractive){ // Interactive mode (filters out ! lines)
      // Handle interactive commands
      logger.debug(`Interactive execution: ${message}`)
      try{
        bot.sendMessage({
          to: channelID,
          message: `>>> ${eval(message)}`
        });
      }
      catch (e){
        bot.sendMessage({
          to: channelID,
          message: `Error: ${e.message}`
        })
      }
    }
});

/**
 * Parses CLI-style flags into an object
 * Example: --a b --c --d 3 --e
 * would return {"a":"b","d":"3","c":true,"e":true}
 * @param {String} inputStr
 * @returns {Object} flags: the flags as keys to value (or true for single flags)
 */
function parseFlags(inputStr){
  // Object of flags: values
  let flags = {};
  let matches;
  try{
    // Define regex to capture --flag val pairs
    matches = inputStr.match(/--\w+ [\w\d]+/g);
    if (matches){
      for (match of matches){
        logger.debug(match)
        match = String(match).split(" ");
        flags[match[0].slice(2)] = match[1]
      }
    }
    // Capture interior --flag flags
    matches = inputStr.match(/--\w+(?= -)/g);
    if (matches){
      for (match of matches){
        flags[match.slice(2)] = true;
      }
    }
    // Capture final-position --flag flags
    matches = inputStr.trim().match(/--\w+(?!.)/)
    if (matches){
      for (match of matches){
        flags[match.slice(2)] = true;
      }
    }
  }
  catch(error){
    logger.warn("Flag parsing failed; error:" + error.message)
  }
  return flags;
}

/**
 * Sends bot.nextMessage after delay given by bot.secondsDelay to channelID
 * @param {Discord.Client} bot
 * @param {String} channelID
 */
function delayedMessage(bot, channelID){
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
 * Pick a quip and load it into bot.nextMessage
 * Uses fs to load file message log file asynchronously.
 * Uses global __dirname, messageLogName.
 * @param {Discord.Client} bot
 */
function pickQuip(bot){
  fs.readFile( `${__dirname}/${config.messageLogName}`, function (err, data) {
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



function botEmoji(id){
  return (id == config.freddyID)? config.coolstorybobEmoji : config.maxsnuzyenEmoji;
}


// Asynchronously parse target user's chat history into log
function asyncParseToLog(channelID, targetUserID, logger){
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


      fs.writeFile(`${config.messageLogName}`, formattedMessageLog, (err) => {
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