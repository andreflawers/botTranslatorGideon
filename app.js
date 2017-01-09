var builder = require('botbuilder');
var restify = require('restify');
var request = require('request');
var parseString = require('xml2js').parseString;

var botConnectorOptions = {

    appId: process.env.BOTFRAMEWORK_APPID,
    appPassword: process.env.BOTFRAMEWORK_APPSECRET
};
var textoTraducir = '';
var server = restify.createServer();
var language;
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

var connector = new builder.ChatConnector(botConnectorOptions);
var bot = new builder.UniversalBot(connector);
server.get('/.*/', restify.serveStatic({
    'directory': '.',
    'default': 'index.html'
}));
server.post('/api/messages', connector.listen());

bot.dialog('/', [function (session) {
    builder.Prompts.choice(session, 'Estas son las opciones , cual eligess :3 ?', 'texto|imagen');

}, function (session, result) {
    if (result.response.entity == 'imagen') {
        session.beginDialog('/translateImage');
    }
    else if (result.response.entity == 'texto') {
        session.beginDialog('/translateText');
    }
}]);
bot.dialog('/translateImage', [
    function (session) {
        builder.Prompts.attachment(session, 'Sube tu imagen :D ');
    },
    function (session, result) {
        var imageUrl = result.response[0].contentUrl;
        session.send(imageUrl);
        var postOptions = {
            headers: {
                "Ocp-Apim-Subscription-Key": process.env.OCR_API__SUB
            },
            url: "http://api.projectoxford.ai/vision/v1.0/ocr?language=unk&detectOrientation=true",
            encoding: 'binary',
        };
        request.get(imageUrl).pipe(request.post(postOptions, function (error, response, body) {
            console.log('execute post');
            if (error) {
                console.log(error);
            }
            var resultOCR = JSON.parse(body);
            language = resultOCR.language;
            console.log('text language:  %s', resultOCR.language);
            for (var region in resultOCR.regions) {
                for (var line in resultOCR.regions[region].lines) {
                    for (var word in resultOCR.regions[region].lines[line].words) {

                        textoTraducir += resultOCR.regions[region].lines[line].words[word].text + " ";


                    }
                }
            }
            session.send('Texto a traducir : ');
            session.send(textoTraducir);
            translating(function (error, textTranslated) {
                if (error)
                { console.log(error); }
                else {
                    console.log(textTranslated);
                    session.send(textTranslated);
                    session.replaceDialog('/');
                    textoTraducir = '';
                }
            });
        }));


        textoTraducir = '';

    }]);

bot.dialog('/translateText', [function (session) {
    builder.Prompts.text(session, 'Ingresa la palabra o texto a traducir :3 ');
}, function (session, result) {

    textoTraducir = result.response;
    request.post(
        {
            headers: {
                'Ocp-Apim-Subscription-Key': process.env.TEXTANALYTICS_SUB,
                'Content-Type': 'application/json'
            },
            url: 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/languages',
            body: '\{"documents": \[\{"id": "textoTraducir", "text": "'+textoTraducir+'"}]}' 
        }, function (error, response, body) {
    if (error)
    { console.error(error) }
    var bodyJson = JSON.parse(body);
    language=bodyJson.documents[0].detectedLanguages[0].iso6391Name;
    translating(function (error, textTranslated) {
                if (error)
                { console.log(error); }
                else {
                    console.log(textTranslated);
                    session.send(textTranslated);
                    session.replaceDialog('/');
                    textoTraducir = '';
                }
            });

    });
    
    
    
}]);

bot.dialog('/firstRun', [
    function (session) {
        session.userData.version = 1.0;
        session.send('Hola %s soy Gideon un gato traductor (tambien puedo escribir, no te sorprendas)', session.message.user.name);
        var msg = new builder.Message(session)
            .attachments([{
                contentType: 'image/gif',
                contentUrl: 'http://media3.giphy.com/media/13HBDT4QSTpveU/200.gif'
            }]);        
        session.send(msg);
        session.replaceDialog('/');

    }

]).triggerAction({
    onFindAction: function (context, callback) {

        var ver = context.userData.version || 0;
        var score = ver < 1.0 ? 1.1 : 0.0;
        callback(null, score);
    }
});

const translating = function (callback) {
    var accessToken;
    request.post({
        url: 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken',
        headers: {
            'Content-Type': 'application/json',
            'Accept': ' application/jwt',
            'Ocp-Apim-Subscription-Key': process.env.TRANSLATOR_SUB

        }
    }, function (error, response, body) {
        if (error) {
            callback(error, null);
            return;
        }
        accessToken = "Bearer " + body;

        var languageTo = 'es';
        if (language == 'es')
        { languageTo = 'en' };

        request.get('https://api.microsofttranslator.com/v2/http.svc/Translate?appid=' + accessToken +
            '&text=' + textoTraducir +
            '&from=' + language +
            '&to=' + languageTo, function (error, response, body) {

                if (error) {
                    console.error(error);
                    callback(error, null);
                }

                parseString(body, function (err, result) {

                    var textoTraducido = JSON.parse(JSON.stringify(result));
                    console.dir('texto traducido ' + textoTraducido.string._);

                    callback(null, textoTraducido.string._);

                });

            });


    });
}
