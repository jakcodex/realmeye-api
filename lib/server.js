var methods = {};
var reapi = {};

/**
 * @function
 * @param req
 * @param res
 * Process class list lookups
 */
methods.class = function (req, res) {

    var classes = Object.keys(reapi.static.classPlurals);
    for ( var i = 0; i < classes.length; i++ ) classes[i] = classes[i].toLowerCase();

    if (
        req.params.class.match(/^([a-zA-Z]*)$/) === null ||
        classes.indexOf(req.params.class.toLowerCase()) === -1
    ) {
        res.json({error: 'Invalid class provided'});
        return;
    }

    if ( typeof req.params.page !== 'number' ) req.params.page = 0;

    reapi.get.list('class', req.params.class, req.params.page, function(result) {
        res.send(JSON.stringify(result, null, 5));
    });
};

/**
 * @function
 * @param req
 * @param res
 * Process most recent deaths lookups
 */
methods.recentdeaths = function (req, res) {

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

        //  do not display private accounts
        if ( req.body.noPrivate ) target.noPrivate = true;

        //  specify a different page
        if ( req.body.page && typeof Number(req.body.page) === 'number' ) req.params.page = Number(req.body.page);

    } else target = {};

    req.params.page = Number(req.params.page);
    if ( typeof req.params.page !== 'number' ) req.params.page = 0;

    reapi.get.list('recentdeaths', target, req.params.page, function(result) {
        res.send(JSON.stringify(result, null, 5));
    });

};

/**
 * @function
 * @param req
 * @param res
 * Process player lookups
 */
methods.player = function (req, res) {

    if (
        req.params.username.match(/^([a-zA-Z]*)$/) === null ||
        req.params.username.length > 10
    ) {
        res.json({error: 'Invalid username provided'});
        return;
    }

    reapi.get.player(req.params.username, function(result) {
        res.send(JSON.stringify(result, null, 5));
    });

};

/**
 * @function
 * @param req
 * @param res
 * Return basic about information
 */
methods.about = function(req, res) {

    res.send(' \
        This is a restful API serving requests for Realmeye.com lookups. The API provides data in JSON format for a range of options. \
        <br><br>More information can be found on Github at the <a href="https://jakcodex.github.io/realmeye-api">project page</a>.\
    ');

};

/**
 * @function
 * @param req
 * @param res
 * Perform a curl test; typically disabled
 */
methods.test = function(req, res) {

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

module.exports = methods;
