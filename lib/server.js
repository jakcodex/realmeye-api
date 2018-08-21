const crypto = require('crypto');
const path = require('path');
var methods = {};
var reapi = {};

/**
 * @function
 * @param req
 * @param res
 * @param next
 * Process class list lookups
 */
methods.class = function (req, res, next) {

    var classes = Object.keys(reapi.static.classPlurals);
    for ( var i = 0; i < classes.length; i++ ) classes[i] = classes[i].toLowerCase();

    if (
        req.params.section.match(/^([a-zA-Z]*)$/) === null ||
        classes.indexOf(req.params.section.toLowerCase()) === -1
    ) {
        res.json({error: 'Invalid class provided'});
        return;
    }

    var target = {class: req.params.section};

    if ( req.method === 'POST' ) {

        //  whether or not to display private accounts
        if ( ['true', 'false'].indexOf(req.body.noPrivate) > -1 ) target.noPrivate = ( req.body.noPrivate === 'true' );

        //  condense accounts to remove most skin and equipment data
        if ( ['true', 'false'].indexOf(req.body.condensed) > -1 ) target.condensed = ( req.body.condensed === 'true' );

    }

    if ( typeof req.params.additional !== 'string' || req.params.additional.match(/^[0-9]$/) === null ) req.params.additional = '0';
    console.log('s', target);
    reapi.get.list('class', target, req.params.additional, function(result) {
        res.send(JSON.stringify(result, null, 5));
        next();
    }, req);
};

/**
 * @function
 * @param req
 * @param res
 * @param next
 * Process most recent deaths lookups
 */
methods.recentdeaths = function (req, res, next) {

    var target = {options: {}};
    if ( req.method === 'POST' ) {

        if ( !req.body ) {
            res.status(400).send('Invalid POST body');
            return;
        }

        //  base fame
        if (
            req.body.bf &&
            typeof Number(req.body.bf) === 'number' &&
            [0, 20, 150, 400, 800, 2000].indexOf(Number(req.body.bf)) > -1
        ) target.options.bf = Number(req.body.bf);

        //  max stats
        if (
            req.body.ms &&
            typeof Number(req.body.ms) === 'number' &&
            [0, 1, 2, 3, 4, 5, 6, 7, 8].indexOf(Number(req.body.ms)) > -1
        ) target.options.ms = Number(req.body.ms);

        //  whether or not to display private accounts
        if ( ['true', 'false'].indexOf(req.body.noPrivate) > -1 ) target.noPrivate = ( req.body.noPrivate === 'true' );

        //  condense accounts to remove most skin and equipment data
        if ( ['true', 'false'].indexOf(req.body.condensed) > -1 ) target.condensed = ( req.body.condensed === 'true' );

        //  whether or not to display bonuses
        if ( ['true', 'false'].indexOf(req.body.bonuses) > -1 ) target.bonuses = ( req.body.bonuses === 'true' );

        //  specify a different page
        if ( req.body.page && typeof Number(req.body.page) === 'number' ) req.params.section = Number(req.body.page);

    } else target = {};

    req.params.section = Number(req.params.section);
    if ( typeof req.params.section !== 'number' ) req.params.section = 0;

    reapi.get.list('recentdeaths', target, req.params.section, function(result) {
        res.send(JSON.stringify(result, null, 5));
        next();
    }, req);

};

/**
 * @function
 * @param req
 * @param res
 * @param next
 * Process player lookups
 */
methods.player = function (req, res, next) {

    if (
        req.params.section.match(/^([a-zA-Z]*)$/) === null ||
        req.params.section.length > 10
    ) {
        res.json({error: 'Invalid username provided'});
        return;
    }

    var target = {};
    if ( req.method === 'POST' ) {

        //  condense accounts to remove most skin and equipment data
        if ( ['true', 'false'].indexOf(req.body.condensed) > -1 ) target.condensed = ( req.body.condensed === 'true' );

    }

    reapi.get.player(req.params.section, target, function(result) {
        res.send(JSON.stringify(result, null, 5));
        next();
    }, req);

};

/**
 * @function
 * @param req
 * @param res
 * @param next
 * Return basic about information
 */
methods.about = function(req, res, next) {

    res.send(' \
        This is a restful API serving requests for Realmeye.com lookups. The API provides data in JSON format for a range of options. \
        <br><br>More information can be found on Github at the <a href="https://jakcodex.github.io/realmeye-api">project page</a>.\
    ');
    next();

};

/**
 * @function
 * @param req
 * @param res
 * Perform a curl test; typically disabled
 */
methods.selftest = function(req, res) {

    res.status(503);
    res.send('Self test is disabled');
    return;

    reapi.io.get('https://whatsmyuseragent.com/', true, function(html, error) {
        if ( error === true ) {
            res.send('There was an error');
            return;
        }
        res.set('Content-Type', 'text/plain');
        res.send(html);
    });

};

/**
 * @function
 * @param {object} api
 * Import the reapi object
 */
methods.init = function(api) {

    reapi = api;

};

/**
 * @function
 * @param req
 * @param res
 * @param next
 * Perform a cache test optionally setting a new value
 */
methods.cachetest = function(req, res, next) {

    if ( ['string', 'undefined'].indexOf(typeof req.params.section) > -1 ) {

        reapi.tools.cachetest(req.params.section, function(result) {
            res.send(JSON.stringify(result, null, 5));
            next();
        }, req);
        return;

    }

    res.json({error: 'Invalid value provided'});

};

/**
 * @function
 * @param req
 * @param res
 * @param next
 * Write an access log entry
 */
methods.accesslog = function(req, res, next) {

    req.data.clock.stop = Date.now();
    req.data.clock.runtime = req.data.clock.stop-req.data.clock.start;
    var args = {
        '_type': 'access',
        'runtimeID': req.data.runtimeID,
        'request_time': (new Date()).toLocaleString(),
        'request_runtime': req.data.clock.runtime.toString(),
        'cf': req.headers['x-cloudflare-client-ip'],
        'xff': req.headers['x-forwarded-for'].split(/, ?/),
        'remoteip': ( (
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress
        ).split(",")[0] || '-' ),
        'response_size': req.socket.bytesRead,
        'method': req.method,
        'uri': req.originalUrl,
        'status': res.statusCode,
        'request_body': req.body,
        'useragent': req.headers['user-agent']
    };
    var data = JSON.stringify(args);
    reapi.tools.writelog(data, 'access');
    if ( typeof next === 'function' ) next();

};

/**
 * @function
 * @param req
 * @param res
 * @param next
 * Start the request clock
 */
methods.startclock = function(req, res, next) {

    if ( !req.data ) req.data = {};
    req.data.clock = {
        start: Date.now()
    };
    next();

};

/**
 * @function
 * @param req
 * @param res
 * @param next
 * Generate the requestID
 */
methods.requestID = function(req, res, next) {

    req.data = {runtimeID: crypto.createHmac('sha256', Date.now().toString()).digest('hex').substr(52, 12)};
    next();

};

/**
 * @function
 * @param req
 * @param res
 * @param next
 * Set default response headers
 */
methods.defaults = function(req, res, next) {

    var keys = Object.keys(reapi.config.defaultHeaders);
    for ( var i = 0; i < keys.length; i++ )
        res.set(keys[i], reapi.config.defaultHeaders[keys[i]]);
    next();

};

/**
 * @function
 * @param req
 * @param res
 * @param next
 * Route requests to available methods
 */
methods.router = function(req, res, next) {

    if ( typeof req.params.method !== 'string' ) throw 'Invalid routing path requested: ' + JSON.stringify(req.params.method);
    if ( typeof methods[req.params.method] !== 'function' ) throw 'Cannot route to ' + JSON.stringify(req.params.method);
    if ( ['player', 'class', 'recentdeaths', 'cachetest', 'selftest', 'about'].indexOf(req.params.method) === -1 ) throw 'Invalid method requested: ' + req.params.method;
    methods[req.params.method](req, res, next);

};

/**
 * @function
 * @param err
 * @param req
 * @param res
 * @param next
 * Write an error log message
 */
methods.error = function(err, req, res, next){

    reapi.tools.systemlog(err, 'error', req);
    console.error(err);
    res.status(500);
    res.set('Content-Type', 'text/json');
    res.send({error: 'Internal server error'});
    next();

};

/**
 * @function
 * @param req
 * @param res
 * @param next
 * Send the examples page
 */
methods.index = function(req, res, next) {

    res.sendFile(path.join(__dirname + '/../examples.html'));
    methods.accesslog(req, res);

};

module.exports = methods;
