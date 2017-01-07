var builder = require('botbuilder');
var restify = require('restify');

var server = restify.createServer();
server.listen(process.env.port||process.env.PORT||3978,function () { 
    console.log('%s listening to %s',server.name,server.url);
 });

var connector = new builder.ChatConnector();
var bot = new builder.UniversalBot(connector);

server.post('/api/messages',connector.listen());
bot.dialog('/',[function (session) {  
    session.beginDialog('/ensureProfile',session.userData.profile);
},function (session,results) {  

}]);

bot.dialog('/ensureProfile',[
    function (session,args,next) {  }
]);