const reapi = require('./lib/reapi.js');
const server = require('./lib/server.js');
const crypto = require('crypto');
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

//  add the requestID
app.use(server.requestID);

//  start the clock
app.use(server.startclock);

//  set post parameter processing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//  static routes
app.get('/about/?', server.about);
app.get('(^/$)|/examples|/index', server.index);

//  api responses have default headers to set
app.use(/^\/api\/?.*?$/i, server.defaults);

//  request routing
app.post('/api/:method/:section/:additional/?', server.router);
app.get('/api/:method/:section/:additional/?', server.router);
app.post('/api/:method/:section/?', server.router);
app.get('/api/:method/:section/?', server.router);
app.post('/api/:method/?', server.router);
app.get('/api/:method/?', server.router);

//  custom error handling
app.use(server.error);

//  write access log
app.use(server.accesslog);

//  bind express to listening port
app.listen(config.listenPort);
