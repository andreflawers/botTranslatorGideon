var builder = require('botbuilder');
var restify = require('restify');
var botConnectorOptions = { 
    appId: process.env.BOTFRAMEWORK_APPID, 
    appSecret: process.env.BOTFRAMEWORK_APPSECRET 
};

var server = restify.createServer();
server.listen(process.env.port||process.env.PORT||3978,function () { 
    console.log('%s listening to %s',server.name,server.url);
 });

var connector = new builder.ChatConnector();
var bot = new builder.UniversalBot(connector);
server.get('/.*/',restify.serveStatic({
    'directory':'.',
    'default':'index.html'
}));
server.post('/api/messages',connector.listen());
bot.dialog('/',[function (session) {  
    builder.Prompts.text(session,'Hola soy Gideon un gato que traduce (tambien puedo escribir, no te sorprendas) como desees que te llame?');
},function (session,results) {  
    session.send('Hola ' + results.response);    
}]);