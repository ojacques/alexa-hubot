/**
 * App ID for the skill
 */
var APP_ID = undefined;//replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

/**
 * SLACK endpoint
 */
var SLACK_ENDPOINT = undefined; //replace with slack endpoint URL: '/services/TXXXXXXX/BXXXXXXXX/UXyay1333Aaaaaqwzzew'
                                //obtained at https://api.slack.com/incoming-webhooks

const https = require('https');

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * ChatOps is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var ChatOps = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
ChatOps.prototype = Object.create(AlexaSkill.prototype);
ChatOps.prototype.constructor = ChatOps;

// ----------------------- Override AlexaSkill request and intent handlers -----------------------

ChatOps.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

ChatOps.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    handleWelcomeRequest(response);
};

ChatOps.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

/**
 * override intentHandlers to map intent handling functions.
 */
ChatOps.prototype.intentHandlers = {
    "ChatOpsStatusIntent": function (intent, session, response) {
        handleChatOpsStatusRequest(intent, session, response);
    },

    "ChatOpsStartIntent": function (intent, session, response) {
        handleChatOpsStartRequest(intent, session, response);
    },

    "ChatOpsStopIntent": function (intent, session, response) {
        handleChatOpsStopRequest(intent, session, response);
    },

    "ChatOpsRestartIntent": function (intent, session, response) {
        handleChatOpsRestartRequest(intent, session, response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        handleHelpRequest(response);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    }
};

// -------------------------- ChatOps Domain Specific Business Logic --------------------------

function handleWelcomeRequest(response) {
  // Use SSML to answer first in French, play an R2D2 mp3, then ask to switch to English.
  var repromptText = "<s>So.</s> <s>How can I help?</s>";
  var speechOutput = "<phoneme alphabet=\"ipa\" ph=\"bɔ̃ʒuʁ\">Bonjour</phoneme>!"
                   + "<audio src=\"https://s3-eu-west-1.amazonaws.com/chatops.audio/R2D2.mp3\" />"
                   + "<s><phoneme alphabet=\"ipa\" ph=\"ʒə nə paʁlə pa bjɛ̃ fʁɑ̃sɛ, "
                   + "alɔʁ kɔ̃tinɥɔ̃ ɑ̃n- ɑ̃ɡlɛ si vu lə vule bjɛ̃\">"
                   + "Je ne parle bien Français. Alors continuons en Anglais si vous le voulez bien.</phoneme></s>"

  response.ask(speechOutput, repromptText);
}

function handleHelpRequest(response) {
    var repromptText = "So. How can I help?";
    var speechOutput = "Here are some things you can say: "
                    + "what is the application status? "
                    + "Start the application. "
                    + "Stop the application. "
                    + "You can also say stop if you are done. ";

    response.ask(speechOutput, repromptText);
}

/**
 * Ask Hubot to give a status on the application
 */
function handleChatOpsStatusRequest(intent, session, response) {

    var message='@mybot docker ps';
    // Handle the request
    getFinalChatOpsResponse(message, response);
}

/**
 * Ask Hubot to start the app
 */
function handleChatOpsStartRequest(intent, session, response) {

    var message='@mybot docker start';
    // Handle the request
    getFinalChatOpsResponse(message, response);
}

/**
 * Ask Hubot to stop the app
 */
function handleChatOpsStopRequest(intent, session, response) {

    var message='@mybot docker stop';
    // Handle the request
    getFinalChatOpsResponse(message, response);
}

/**
 * Ask Hubot to restart the app
 */
function handleChatOpsRestartRequest(intent, session, response) {

    var message='@mybot docker restart';
    // Handle the request
    getFinalChatOpsResponse(message, response);
}

/**
 * Both the one-shot and dialog based paths lead to this method to issue the request, and
 * respond to the user with the final answer.
 */
function getFinalChatOpsResponse(message, response) {

    console.log ("In getFinalChatOpsResponse");
    // Issue the request, and respond to the user
    makeSlackRequest(message, function SlackResponseCallback(err) {
        var speechOutput;

        if (err) {
          speechOutput = "Sorry, Slack service is experiencing a problem. Please try again later";
        } else {
          if (message.indexOf('stop') > -1) {
            speechOutput = "Hang tight! I'm stopping the application.";
          } else if (message.indexOf('restart') > -1) {
            speechOutput = "I am restarting the application.";
          } else if (message.indexOf('start') > -1) {
            speechOutput = "Starting the application.";
          } else if (message.indexOf('docker ps') > -1) {
            speechOutput = "OK, I asked for the status of the application. You can now check Slack for details.";
          } else {
            speechOutput = "OK, I posted your message to Slack";
          }
        }

        response.tellWithCard(speechOutput, "ChatOps", speechOutput);
    });
}

/**
 * Uses SLACK incoming web hook, documented: https://api.slack.com/incoming-webhooks
 */
function makeSlackRequest(message, SlackResponseCallback) {

    console.log("Posting in Slack");

    var post_data = JSON.stringify({
        text: message
    });

    var post_options = {
        hostname: 'hooks.slack.com',
        port    : 443,
        path    : SLACK_ENDPOINT,
        method  : 'POST',
        headers : {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Content-Length': post_data.length
        }
    };

    var req = https.request(post_options, function (res) {
      var SlackResponseString = '';
      res.setEncoding('utf8');
      console.log('Status Code: ' + res.statusCode);
      if (res.statusCode != 200) {
          SlackResponseCallback(new Error("Non 200 Response"));
      }
      res.on('data', function (body) {
          console.log('Body: ' + body);
          SlackResponseString += body;
      });
      res.on('end', function () {
          if (SlackResponseString != "ok") {
            console.log("SLACK error: " + SlackResponseString);
            SlackResponseCallback(new Error(SlackResponseString));
          } else {
              // All good!
              console.log("Message '" + message + "' posted in SLACK");
              SlackResponseCallback(null);
          }
      });
    });

    req.write(post_data);
    req.end();
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var chatOps = new ChatOps();
    chatOps.execute(event, context);
};
