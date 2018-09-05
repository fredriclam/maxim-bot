var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');

// Maxim data
const maximUserId = 163475101046538240;

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

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');

});
bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`

    // trahs
    // if (message.substring(0, 1) == '!') {
    // console.log(userID);
    console.log(message);

    // Lower case command
    var cmd = message.toLowerCase();

    // Capture @mnhn329
    if (cmd.includes(String(maximUserId)) || cmd.includes('@mnhn329')) {
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
        console.log('Timer started');
      }

      // bot.sendMessage({
      //     to: channelID,
      //     message: 'I see you pinged maxim :maximwhatsthis:'
      // });
    }

    if (cmd.includes('!maximback') || userID == maximUserId){
      try{
        clearTimeout(timer);
        console.log('Timer stopped');
      }
      catch(error){
        console.log("hehe probably timer didn't exist");
      }
      bot.isTimerOn = false;
    }

    // switch(cmd) {
    //     // !ping
    //     case '@mnhn329':
    //         bot.sendMessage({
    //             to: channelID,
    //             message: 'Pong!'
    //         });
    //     break;
    //     // Just add any case commands if you want to..
    //  }
});
