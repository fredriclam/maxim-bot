var Discord = require('discord.io');
var {createLogger, format, transports} = require('winston');
var {combine, printf, timestamp} = format;
var auth = require('./auth.json');
var fs = require('fs');

// Constant IDs
const weeabooChannelId = "215694187977375746"
const MAX_ID = "163475101046538240";
const FREDDY_ID = "265678340692770816";
// Default quip
let defaultMessage = 'Maxim afk';
let maxsnuzyenEmoji = '<:maxsnuzyen:489283891807518720>';
let coolstorybobEmoji = '<:coolstoryfred:503693902730100736>'
// Message log file name
messageLogName = 'messages.log'
// Define logger file names
loggerFileName = './logger.log'
// Users log file name
userLogName = './users.log'

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
      filename: loggerFileName,
      level: 'debug'
    }),
    new transports.File({
      filename: loggerFileName,
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
  nextMessage: defaultMessage,
  // Flag to check for timer
  isTimerOn: false,
  // Default learning target
  learningTargetId: MAX_ID,
  // Default bank of quips is empty
  quipList: [],
  // Timer delay (seconds)
  secondsDelay: 5 * 1000,
  // Lines to output on dump
  dumpLength: 5,
  // Max dump length
  maxDumpLength: 10,
  // Next message bot will dump
  nextMessage: defaultMessage,
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
    asyncParseToLog(weeabooChannelId, bot.learningTargetId);
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
      // List of commands (manually updated)
      cmd_list = ['learn', 'log', 'env', 'help', 'set', 'msgs', 'who', 'goodbot', 'badbot', 'maximback', 'dance'];
      // Split message after '!' token by spaces
      let args = msg.substring(1).split(' ');
      // Parse main command !cmd
      let cmd = args[0];
      // Parse optional flags
      flags = parseFlags(args.slice(1).join(" "));
      // Log total input
      logger.debug(`Inputs parsed: ${args}, with option flags (--x): ${JSON.stringify(flags)}`);

      switch(cmd) {
        case 'learn': // Switch target
          learnTarget(bot, args[1], channelID);
          break;
        case 'log': // Check logs
          // Parse additional args
          logDump(bot, channelID, flags);
          break;
        case 'env': // Return environment
          bot.sendMessage({
            to: channelID,
            message: "```JSON\nEnvironment:\n" +
              `Default channel ID: ${weeabooChannelId}\n` +
              `Channel ID: ${channelID}\n` +
              `Bot ID: ${bot.id}\n` +
              `Followed: ${bot.learningTargetId} == ` +
              `"${bot.users[bot.learningTargetId].username}"\n` +
              "```"
          })
          break;
        case 'help': // Get command list
          formattedList = cmd_list.map(s => '`!' + s + '` ').join(" ");
          bot.sendMessage({
            to: channelID,
            message: `Here's the list of commands, although I'd rather sleep ${maxsnuzyenEmoji}: \n${formattedList}`
          })
          break;
        case 'set': // Set properties
          validateAndSet(bot, flags);
          break;
        case 'msgs': // Upload messages list
          bot.uploadFile({
            to: channelID,
            file: messageLogName,
            message: "Message list uploaded."
          })
          break;
        case 'who': // Return who is on channel
          fs.writeFile(`${userLogName}`, JSON.stringify(bot.users), (err, data) => {
            if (err)
              logger.error("Error writing users file: " + err.message);
            bot.uploadFile({
                to: channelID,
                file: userLogName,
                message: "Users file uploaded."
            })
          })
          break;
        case 'goodbot': // Yay
          break;
        case 'badbot': // Aww
          break;
        case 'maximback':
          interruptTimer(bot);
          break;
        case 'db': // Interactive debugger
          if (flags.off){
            bot.isInteractive = false;
            bot.sendMessage({
              to: channelID,
              message: "Finished interactive debug mode."
            });
          }
          else if (flags.it){
            bot.isInteractive = true;
            bot.sendMessage({
              to: channelID,
              message: "Entered interactive debug mode."
            });
          }
          break;
        case 'dance':
          bot.sendMessage({
            to: channelID,
            embed: {
              "url": "https://discordapp.com",
              "image": {
                "url": "https://media.tenor.com/images/2ef0284a5bdb2a8c5346699814059570/tenor.gif"
              },
              "author": {
                "name": bot.users[userID].username
              },
              "fields": []
            }
          }, (err) => {if (err) {logger.error(err)}});
          // Replace message
          // bot.deleteMessage({
          //     channelID: channelID,
          //     messageID: evt.d.id
          //   }, (err, data) => {
          //     if (err) logger.error(`Error encountered while replacing message: ${err.message}`);
          //   });
          // logger.info("Overwrote !dance");
          break;
        default:
          bot.sendMessage({
            to: channelID,
            message: `Wait what ${maxsnuzyenEmoji}`
          })
      }
    }
    else if (bot.isInteractive){ //Not !command
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
 * Validates and sets bot properties according to flags if property is settable.
 * No input sanitization implemented yet, so use at your own risk.
 * Refers to settableProperties's properties
 * @param {Discord.Client} bot
 * @param {Object} flags : the flags as keys to value (or true for single flags)
 */
function validateAndSet(bot, flags){
  logger.warn("Set method called. Hope you know what you're doing.");
  for (propKey in settableProperties){
    if (flags[propKey.toLowerCase()]){
      // Restrictions for each property
      // Set property
      bot[propKey] = flags[propKey.toLowerCase()];
      logger.info(`${propKey} changed to ${bot[propKey]}`);
    }
  }
}

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
 * Interrupts bot's timer for next message
 * @param {Discord.Client} bot
 */
function interruptTimer(bot){
  if (bot.isTimerOn){
    try{
      clearTimeout(bot.timer);
      logger.info('Timer stopped.');
    }
    catch(error){
      logger.info("Probably timer didn't exist; following timer stop error was caught: " + error.message)
    }
    bot.isTimerOn = false;
  }
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
 * Dumps log to Discord chat, using (optional) flags to filter results.
 *
 * Warning: dependent on logger file formatting to filter log entries
 * by flag.
 *
 * Uses logger, and fires message to channelID.
 * Uses fs to load logger file asynchronously (Winston logger broken)
 * Uses global __dirname, messageLogName.
 * @param {Discord.Client} bot
 * @param {String} channelID
 * @param {Object} flags: the flags mapping flags (keys) to vals (or true)
 */
function logDump(bot, channelID, flags){
  // File request
  if(flags["all"]){
    bot.uploadFile({
      to: channelID,
      file: loggerFileName,
      message: "Logger logs uploaded."
    })
  }
  // Read log and dump
  fs.readFile(`${__dirname}/${loggerFileName}`, function(err, data){
    if (err) logger.error("Error caught reading logger file: " + err.message);
    // Sanitize and split input into lines
    ingestedLines =  data.toString().replace("```","").trim().split('\n');
    // Filter according to flag, using broadest flag
    hasTypeInLine = (type, line) => line.slice(0,11).indexOf(type) != -1
    // Header string for log output
    logName = "Logger default logs: ";
    // Filtering if specified, in specific
    if(flags["error"]){
      ingestedLines = ingestedLines.filter(
        line => hasTypeInLine("error", line));
      logName = "Errors: ";
    }
    else if (flags["critical"]){
      ingestedLines = ingestedLines.filter(
        line => hasTypeInLine("critical", line));
      logName = "Critical logs: ";
    }
    else if (flags["warn"]){
      ingestedLines = ingestedLines.filter(
        line => hasTypeInLine("warn", line));
      logName = "Warnings: ";
    }
    else if(flags["info"]){
      ingestedLines = ingestedLines.filter(
        line => hasTypeInLine("info", line));
      logName = "Info logs: ";
    }
    else if (flags["debug"]){
      ingestedLines = ingestedLines.filter(
        line => hasTypeInLine("debug", line));
      logName = "Debug (only) logs: ";
    }
    // Build log string
    if (ingestedLines.length == 0)
      logString = "No logs found.";
    else {
      logString = '```JSON\n' + ingestedLines.slice(-bot.dumpLength)
                              .join('\n```\n```JSON\n') + '```';
      logString = `${logName} (last ` + bot.dumpLength + " lines):\n" + logString;
    }
    // Dump to chat
    bot.sendMessage({
      to: channelID,
      message: logString
    }, function(err) {
      if (err){
        logger.error("Error dumping logs: " + err.message);
        bot.sendMessage({
          to: channelID,
          message: "Failed to dump logs. Logs may be too big."
        })
      }})
  })
}

/**
 * Switches bot to a new target.
 * Sets bot.learningTargetId and presence of bot using bot.setPresence.
 * Uses logger and fires messages to channelID
 * @param {Discord.Client} bot
 * @param {String} target: raw string (second argument of command sent to bot).
 * @param {String} channelID
 */
function learnTarget(bot, target, channelID) {
  // Extract largest number, whether or not enclosed by <@ ... >
  let re = new RegExp(/\D*(\d+)/);
  extractedId = re.exec(target);
  logger.debug("ExtractedID + target: "+ extractedId + target)
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
