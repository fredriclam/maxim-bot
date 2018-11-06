config = require("./config.js");
fs = require("fs");

commandsDir = [];
// List of commands as functions (called by !<function name>)
commandsList = [
    function learn(env){ // Switch target
        const {bot, args, channelID, logger} = env;
        learnTarget(bot, args[1], channelID, logger);
    },
    function log(env){ // Check logs
        const {bot, channelID, flags} = env;
        logDump(bot, channelID, flags);
    },
    function env(env){ // Return environment
        const {bot, channelID} = env;
        bot.sendMessage({
            to: channelID,
            message: "```JSON\nEnvironment:\n" +
              `Process architecture: ${process.env.PROCESSOR_ARCHITECTURE}\n` +
              `Default channel ID: ${config.weeabooChannelId}\n` +
              `Current channel ID: ${channelID}\n` +
              `Bot ID: ${bot.id}\n` +
              `Followed: ${bot.learningTargetId} == ` +
              `"${bot.users[bot.learningTargetId].username}"\n` +
              "```"
          })
    },
    function help(env){ // Get command list
        const {bot, channelID} = env;
        let formattedList = commandsDir.sort().map(s => '`!' + s + '` ').join(" ");
        bot.sendMessage({
            to: channelID,
            message: `Here's the list of commands, although I'd rather sleep ${config.maxsnuzyenEmoji}: \n${formattedList}`
        })
    },
    function set(env){ // Set properties
        const {bot, flags, logger} = env;
        validateAndSet(bot, flags, logger);
    },
    function msgs(env){ // Upload messages list
        const {bot, channelID} = env;
        bot.uploadFile({
            to: channelID,
            file: config.messageLogName,
            message: "Message list uploaded."
        })
    },
    function who(env){ // Return who is on channel
        const {bot, channelID, logger} = env;
        fs.writeFile(`${config.userLogName}`, JSON.stringify(bot.users), (err, data) => {
            if (err)
                logger.error("Error writing users file: " + err.message);
            bot.uploadFile({
                to: channelID,
                file: config.userLogName,
                message: "Users file uploaded."
            })
        })
    },
    function goodbot(env){ // Yay
        const {bot, channelID, evt, logger} = env;
        bot.addReaction({
            channelID: channelID,
            messageID: evt.d.id,
            reaction: config.poggers
          }, (err) => {
            if (err) {console.log(err); logger.error(`Reaction error: ${err.message}`)}
          });
    },
    function badbot(env){ // Aww
        const {bot, channelID, evt, logger} = env;
        bot.addReaction({
            channelID: channelID,
            messageID: evt.d.id,
            reaction: config.maxsnuzyen
        }, (err) => {
            if (err) {console.log(err); logger.error(`Reaction error: ${err.message}`)}
        });
    },
    function yikes(env){ // React to yikes message
        const {bot, channelID, evt, logger} = env;
        bot.addReaction({
            channelID: channelID,
            messageID: evt.d.id,
            reaction: config.altmonkaS
        }, (err) => {
            if (err) {console.log(err); logger.error(`Reaction error: ${err.message}`)}
        });
    },
    function maximback(env){
        const {bot, logger} = env;
        interruptTimer(bot, logger);
    },
    function db(env){ // Interactive debugger
        const {bot, channelID, flags} = env;
        if (flags.off && bot.isInteractive){
            bot.isInteractive = false;
            bot.sendMessage({
                to: channelID,
                message: "Finished interactive debug mode."
            });
        }
        else if (flags.it && !bot.isInteractive){
            bot.isInteractive = true;
            bot.sendMessage({
                to: channelID,
                message: "Entered interactive debug mode."
            });
        }
    },
    function dance(env){
        const {bot, channelID, logger, userID} = env;
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

        // Replace message (requires elevated bot permissions)
        // bot.deleteMessage({
        //     channelID: channelID,
        //     messageID: evt.d.id
        //   }, (err, data) => {
        //     if (err) logger.error(`Error encountered while replacing message: ${err.message}`);
        //   });
        // logger.info("Overwrote !dance");
    },
];

// Assign commands as properties
commands = {};
for(command of commandsList){
    commands[command.name] = command;
}
// Get list of properties
commandsDir = Object.keys(commands)

// Command-execute handler
function exec(cmd, env){
    if (commandsDir.includes(cmd)){
        // Execute
        commands[cmd](env);
    }
    else { // Not executed
        console.log(cmd);
        console.log(commandsList);
        bot.sendMessage({
            to: channelID,
            message: `Wait what ${config.maxsnuzyenEmoji}`
        })
    }
}

// Define exports
exports.dir = commandsDir; // List of all commands
exports.exec = exec;

// Unintegrated functions

/**
 * Validates and sets bot properties according to flags if property is settable.
 * No input sanitization implemented yet, so use at your own risk.
 * Refers to settableProperties's properties
 * @param {Discord.Client} bot
 * @param {Object} flags : the flags as keys to value (or true for single flags)
 * @param {winston.logger} logger
 */
function validateAndSet(bot, flags, logger){
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
 * Switches bot to a new target.
 * Sets bot.learningTargetId and presence of bot using bot.setPresence.
 * Uses logger and fires messages to channelID
 * @param {Discord.Client} bot
 * @param {String} target: raw string (second argument of command sent to bot).
 * @param {String} channelID
 * @param {winston.logger} logger
 */
function learnTarget(bot, target, channelID, logger) {
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
      asyncParseToLog(channelID, newLearningTargetId, logger);
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
        file: config.loggerFileName,
        message: "Logger logs uploaded."
      })
    }
    // Read log and dump
    fs.readFile(`${__dirname}/${config.loggerFileName}`, function(err, data){
      if (err) logger.error("Error caught reading logger file: " + err.message);
      // Flag length
      if(flags["n"]){
          let n = parseInt(flags["n"]);
          bot.dumpLength = n > 0 && n < 20 ? n : bot.dumpLength;
      }
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

/**
 * Interrupts bot's timer for next message
 * @param {Discord.Client} bot
 * @param {winston.logger} logger
 */
function interruptTimer(bot, logger){
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