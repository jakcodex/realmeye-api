const reapi = require('./lib/reapi.js');
const server = require('./lib/server.js');
const config = {
    listenPort: 3000
};

//  prepare environment
server.init(reapi);
var express = require('express');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();

//  set favicon
app.use(favicon(path.join(__dirname, 'favicon.png')));

//  set post parameter processing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//  api responses have default headers to set
app.use(/^\/api\/?.*?$/i, function(req, res, next) {

    console.log('API request to ' + req.baseUrl);
    res.set('Content-Type', 'text/json');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    next();

});

//  player api
app.get('/api/player/:username', server.player);

//  class api
app.get('/api/class/:class', server.class);

//  recent deaths api
app.get('/api/recentdeaths/:page', server.recentdeaths);
app.get('/api/recentdeaths/?', server.recentdeaths);
app.post('/api/recentdeaths/?', server.recentdeaths);

//  other uris
app.get('/api/selftest', server.selftest);
app.get('/about|/', server.about);

//  bind express to listening port
app.listen(config.listenPort);
