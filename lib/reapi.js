var Curl = require('node-libcurl').Curl;
const fs = require('fs');
const crypto = require('crypto');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const util = require('util');
var $ = null;
var redis = new (require('ioredis'))();

var reapi = {
    cache: {inflight: {}},
    init: false,
    config: {regex: {}, cache: {}},
    static: {},
    io: {js: {}},
    get: {},
    char: {},
    error: {},
    tools: {}
};

//  configuration
reapi.config.version = '0.2.0';
reapi.config.url = 'https://www.realmeye.com';
reapi.config.listenPort = 3000;
reapi.config.cache = {
    enabled: true,
    prefix: 'reapi_',
    lockTtl: 30000
};
reapi.config.logpath = '/home/jakcodex/reapi.jakcodex.io/logs';
reapi.config.curlOpts = {
    'USERAGENT': 'Jakcodex/reapi - https://reapi.jakcodex.io/about'
};
reapi.config.defaultHeaders = {
    'Content-Type': 'text/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST'
};
reapi.config.regex.renumbers = new RegExp(/(&.*;)/);
reapi.config.regex.lastpage = new RegExp(/^\/.*?\/([0-9]*)01.*?$/);

//  other things
reapi.static.classPlurals = {
    Archer: 'Archers',
    Assassin: 'Assassins',
    Huntress: 'Huntresses',
    Knight: 'Knights',
    Mystic: 'Mystics',
    Necromancer: 'Necromancers',
    Ninja: 'Ninjas',
    Paladin: 'Paladins',
    Priest: 'Priests',
    Rogue: 'Rogues',
    Samurai: 'Samurai',
    Sorcerer: 'Sorcerers',
    Trickster: 'Tricksters',
    Warrior: 'Warriors',
    Wizard: 'Wizards'
};

reapi.static.classIds = {
    775: 'Archer',
    800: 'Assassin',
    802: 'Huntress',
    798: 'Knight',
    803: 'Mystic',
    801: 'Necromancer',
    806: 'Ninja',
    799: 'Paladin',
    784: 'Priest',
    768: 'Rogue',
    785: 'Samurai',
    805: 'Sorcerer',
    804: 'Trickster',
    797: 'Warrior',
    782: 'Wizard'
};

/**
 * @function
 * @param {function} callback
 * @param {object} e
 * @param {string} method
 * @param {object} args
 * @param {string} message
 * ==Old== Create and return an error object to the callback
 */
reapi.error.object = function(callback, e, method, args, message) {

    var error = {
        time: new Date().toLocaleString(),
        method: method,
        args: args
    };
    if ( e.status ) error.status = e.status;
    if ( e.statusText ) error.statusText = e.statusText;
    if ( message ) error.message = message;

    console.log('error', error);
    callback(error);

};

/**
 * @function
 * @param {jquery} jq
 * @param {object} LastPage
 * Find last page id for non-standard 10-page lists
 */
reapi.get.findLastPage = function(jq, LastPage) {

    var data = jq('nav.text-center ul li');
    for ( var index = 0; index < data.length; index++ ) {

        var self = jq(data[index]);
        if ( self.text() === 'Last' ) {
            LastPage.page = Number(self.find('a').attr('href').match(reapi.config.regex.lastpage)[1]);
            if ( typeof LastPage.page !== 'number' ) LastPage.page = 10;
        }

    }

};

/**
 * @function
 * @param {object} data
 * @param {object} target
 * @returns {*}
 * Parse a skin list
 */
reapi.get.skinData = function(data, target) {

    if ( typeof target === 'object' && target.condensed === true ) return null;

    var result = {
        class: Number(data.attr('data-class')),
        skin: Number(data.attr('data-skin')),
        dye1: Number(data.attr('data-dye1')),
        dye2: Number(data.attr('data-dye2')),
        'accessory-dye-id': Number(data.attr('data-accessory-dye-id')),
        'clothing-dye-id': Number(data.attr('data-clothing-dye-id'))
    };

    if ( typeof data.attr('href') === 'string' ) {
        result.url = reapi.config.url + data.attr('href');
    } else {
        result.url = reapi.config.url +
            '/top-characters-with-outfit/' +
            result.class + '/' +
            result.skin + '/' +
            result['clothing-dye-id'] + '/' +
            result['accessory-dye-id'];
    }

    return result;

};

/**
 * @function
 * @param {jquery} self
 * @param {number} TdIndex
 * @param {object} target
 * @returns {*}
 * Parse an equipment list from a supplied jquery object
 */
reapi.get.equipData = function(self, TdIndex, target) {

    var EquipmentIndex = 1;
    var tmp;
    var result = {
        weapon: {url: undefined, title: undefined},
        ability: {url: undefined, title: undefined},
        armor: {url: undefined, title: undefined},
        ring: {url: undefined, title: undefined},
        backpack: {url: undefined, title: undefined}
    };
    for ( var i in result ) {

        if ( result.hasOwnProperty(i) ) {

            tmp = self.find('td:nth-child(' + TdIndex + ') span:nth-child(' + EquipmentIndex + ')');
            if ( i === 'backpack' ) result[i] = ( tmp.length > 0 );
            if ( i === 'backpack' ) continue;

            if ( typeof target === 'object' && target.condensed === true ) {

                result[i] = tmp.find('span[class="item"]').attr('title');

            } else {

                result[i].url = reapi.config.url + tmp.find('a').attr('href');
                result[i].title = tmp.find('span[class="item"]').attr('title');

            }

            EquipmentIndex++;

        }

    }

    return result;

};

/**
 * @function
 * @param {object} data
 * @param {object} target
 * @returns {object}
 * Remove null and undefined entries from supplied data
 */
reapi.get.cleanResults = function(data, target) {

    if ( typeof target !== 'object' ) target = {};
    for ( var i in data ) {

        if (data.hasOwnProperty(i)) {

            //  only show bonuses if requested
            if ( target.bonuses === false && i === 'bonuses' ) delete data[i];

            //  remove condensed data
            if ( target.condensed === true && (data[i] === null || data[i] === undefined || data[i] === 'hidden') ) delete data[i];

        }

    }

    return data;

};

/**
 * @function
 * @param {string} url
 * @param {function | boolean} raw
 * @param {function} callback
 * @param {object} [req]
 * Perform a request and return a jquery object of the result
 */
reapi.io.get = function(url, raw, callback, req) {

    function apiRequest(unlock, cache) {

        reapi.tools.systemlog('api request: ' + url, 'lookups', req);
        var curl = new Curl(),
            close = curl.close.bind(curl);

        curl.setOpt('URL', url);
        curl.setOpt('USERAGENT', reapi.config.curlOpts.USERAGENT);
        curl.setOpt('FOLLOWLOCATION', true);

        curl.on('end', function(statusCode, html, headers) {

            //  store cache object if enabled
            if (
                reapi.config.cache.enabled === true &&
                statusCode === 200
            ) {
                reapi.tools.systemlog('cache set: page_' + url, 'lookups', req);
                reapi.cache.set('page_' + url, html, 300000, req);
            }

            //  unlock
            if ( unlock === true ) reapi.cache.lock('page_' + url, false, req);

            //  process the response
            processHtml(statusCode, html, headers);

            //if ( reapi.cache.inflight['page_' + url] ) delete reapi.cache.inflight['page_' + url];

        });

        curl.on('error', function() {

            curl.close.bind(curl);

            if ( typeof cache === object && cache.value ) {
                callback(cache.value);
                return;
            }
            callback(undefined, true);

        });
        curl.perform();

    }

    function processHtml(statusCode, html, headers) {

        if(statusCode === 200){

            if ( raw === true ) {
                callback(html);
                return;
            }

            callback(reapi.tools.jq(html));

        } else {

            //some error handling
            if ( typeof reapi.cache.inflight['page_' + url] === 'object' ) {
                callback(reapi.cache.inflight['page_' + url].value);
                return;
            }
            callback(undefined, true);

        }

    }

    if ( typeof raw === 'function' ) {
        callback = raw;
        raw = undefined;
    }

    url = ( raw === true ) ? url : (reapi.config.url + url);
    reapi.tools.systemlog('reapi.io.get', url, 'lookups', req);

    if ( reapi.config.cache.enabled === true ) {

        reapi.cache.get('page_' + url, function(result) {

            if ( typeof result === 'object' ) {

                if ( result.fresh === false ) {

                    reapi.cache.lock('page_' + url, true, function(locked) {

                        if ( locked === true ) {

                            reapi.cache.inflight['page_' + url] = {value: result.value, ts: Date.now()};
                            reapi.tools.systemlog('cache refresh: page_' + url, 'lookups', req);
                            apiRequest(true, result);
                            return;

                        }

                        reapi.tools.systemlog('cache stale: page_' + url, 'lookups', req);
                        processHtml(200, result.value);

                    });
                    return;

                }

                reapi.tools.systemlog('cache hit: page_' + url, 'lookups', req);
                processHtml(200, result.value);
                return;

            }

            if (
                reapi.cache.inflight['page_' + url] &&
                (
                    (reapi.cache.inflight['page_' + url].ts+reapi.config.cache.lockTtl) > Date.now()
                )
            ) {

                reapi.tools.systemlog('cache stale inflight: page_' + url, 'lookups', req);
                processHtml(200, reapi.cache.inflight['page_' + url].value);
                return;

            } else delete reapi.cache.inflight['page_' + url];

            reapi.tools.systemlog('cache miss: page_' + url, 'lookups', req);
            apiRequest();

        }, req);

        return;

    }

    apiRequest();

};

/**
 * @function
 * @param {jquery} jq
 * @param {object} target
 * @param {number} page
 * @param {function} callback
 * @param {object} [req]
 * Display the most recent deaths with optional filters
 */
reapi.get.recentdeaths = function(jq, target, page, callback, req) {

    //  recent deaths has a variable last page (could be 5, could be 1550, etc)
    var LastPage = {page: 10};
    reapi.get.findLastPage(jq, LastPage);
    LastPage = ( typeof LastPage.page === 'number' ) ? LastPage.page : 10;
    if ( typeof target.options === 'undefined' ) target.options = {};
    var result = {
        meta: {
            runtimeID: ( req.data.runtimeID || undefined ),
            date: new Date().toLocaleString(),
            uri: target.url,
            query: {
                bf: target.options.bf || 0,
                ms: target.options.ms || 0
            },
            nextPage: ( (page >= 0 && page < LastPage ) ? Number(page) + 1 : null ),
            prevPage: ( (page > 0 && page < (LastPage+1) ) ? Number(page) - 1 : null ),
            currPage: page,
            lastPage: LastPage,
            resultCount: 0,
            privateCount: 0
        },
        chars: []
    };

    //  if the page doesn't exist
    if ( Number(page) > Number(LastPage) ) {

        reapi.error.object(callback, {}, 'reapi.get.recentdeaths', jq.extend(true, {}, {page: page}, target), 'Specified page does not exist.');
        return;

    }

    var DeathData = jq('table[id="d"] tbody tr');
    for (var index = 0; index < DeathData.length; index++) {

        var self = jq(DeathData[index]);

        var tmp = {};
        var rank = index+1;
        if ( page > 0 ) rank = rank+(page*100);

        //  is user private?
        if ( self.find('td:nth-child(1) span[class="private-character"]').length > 0 ) {

            result.meta.privateCount++;
            if ( !target.noPrivate || target.noPrivate === false ) {

                //  we can track backpacks!
                var push = {grave: rank, private: true};
                if (self.find('td:nth-child(6) span:nth-child(5) a span[title="Backpack"]').length > 0) push.equipment = {backpack: true};
                result.chars.push(push);

            }

        } else {

            result.chars.push(reapi.get.cleanResults({
                grave: rank,
                username: self.find('td:nth-child(2) a').text(),
                url: reapi.config.url + self.find('td:nth-child(2) a').attr('href'),
                class: reapi.static.classIds[self.find('td:nth-child(1) span[class="character"]').data('data-class')],
                diedon: self.find('td:nth-child(3)').text(),
                killedby: self.find('td:nth-child(8)').text(),
                basefame: Number(self.find('td:nth-child(4)').text().replace(reapi.config.regex.renumbers, '')),
                totalfame: Number(self.find('td:nth-child(5)').text().replace(reapi.config.regex.renumbers, '')),
                bonuses: JSON.parse(self.find('td:nth-child(5) span.total-fame').attr('data-bonuses')),
                stats: self.find('td:nth-child(7)').text(),
                skin: reapi.get.skinData(self.find('td:nth-child(1) span[class="character"]'), target),
                equipment: reapi.get.equipData(self, 6, target)
            }, target));

        }

    }

    result.meta.resultCount = result.chars.length;
    callback(result);

};

/**
 * @function
 * @param {jquery} jq
 * @param {object} target
 * @param {number} page
 * @param {function} callback
 * @param {object} [req]
 */
//  parse data for a top class list
reapi.get.class = function(jq, target, page, callback, req) {

    if ( typeof target === 'string' ) target = {url: null, class: target};
    var result = {
        meta: {
            runtimeID: ( req.data.runtimeID || undefined ),
            date: new Date().toLocaleString(),
            uri: reapi.config.url + target.url,
            class: target.class,
            nextPage: ( (page >= 0 && page < 9 ) ? Number(page) + 1 : null ),
            prevPage: ( (page > 0 && page < 10 ) ? Number(page) - 1 : null ),
            currPage: page,
            resultCount: undefined,
            privateCount: 0
        },
        chars: []
    };

    //  I should probably not rely on this table id
    var ClassData = jq('table[id="d"] tbody tr');
    var self;
    for (var index = 0; index < ClassData.length; index++) {

        self = jq(ClassData[index]);

        var rank = index+1;
        if ( page > 0 ) rank = rank+(page*100);

        //  is user private?
        if ( self.find('td:nth-child(2) span[class="private-character"]').length > 0 ) {

            result.meta.privateCount++;
            if ( !target.noPrivate || target.noPrivate === false ) result.chars.push({rank: rank, private: true});

        } else {

            var server = self.find('td:nth-child(9)').text();
            if ( server.length < 1 ) server = "hidden";
            result.chars.push(reapi.get.cleanResults({
                rank: rank,
                username: self.find('td:nth-child(3) a').text(),
                url: reapi.config.url + self.find('td:nth-child(3) a').attr('href'),
                fame: Number(self.find('td:nth-child(4)').text().replace(reapi.config.regex.renumbers, '')),
                exp: Number(self.find('td:nth-child(5)').text().replace(reapi.config.regex.renumbers, '')),
                stats: self.find('td:nth-child(7)').text(),
                skin: reapi.get.skinData(self.find('td:nth-child(2) .character'), target),
                equipment: reapi.get.equipData(self, 6, target),
                lastseen: self.find('td:nth-child(8)').text(),
                server: server
            }, target));

        }

    }

    result.meta.resultCount = result.chars.length;
    callback(result);

};

/**
 * @function
 * @param {string} list
 * @param {object} target
 * @param {number | string} [page]
 * @param {function} [callback]
 * @param {object} [req]
 * Initiates a list lookup (class, recent deaths, etc)
 */
reapi.get.list = function(list, target, page, callback, req) {

    if ( !page || page === false ) page = 0;
    if ( typeof reapi.get[list] === 'undefined' ) reapi.error.object(
        callback,
        null,
        'reapi.get.list',
        {list: list, target: target, page: page},
        'Invalid list provided'
    );

    page = parseInt(page, 10);
    var CurrentPage = page;
    var PageCap = 10;
    if ( list === 'recentdeaths' ) PageCap = 10000000;
    if ( typeof page === 'number' && page < PageCap && page > 0 ) CurrentPage = page.toString() + '01';

    var url = '';
    if ( list === 'recentdeaths' ) {
        url = '/recent-deaths' + ( (CurrentPage.toString().match(/^[1-9]*01$/)) ? '/' + CurrentPage : '' );
        var count = 0;
        for ( var i in target.options ) {

            if ( target.options.hasOwnProperty(i) ) {

                if ( typeof target.options[i] === 'number' ) {
                    count++;
                    url += ( count === 1 ) ? '?' : '&';
                    url += i + '=' + target.options[i];
                }

            }

        }

    } else if ( list === 'class' ) {

        var classes = Object.keys(reapi.static.classPlurals);
        for ( var i2 = 0; i2 < classes.length; i2++ ) classes[i2] = classes[i2].toLowerCase();
        if ( typeof target === 'string' ) target = {url: url, class: target.toLowerCase()};
        if ( typeof target === 'object' && !target.url ) target.url = url;

        if ( classes.indexOf(target.class) === -1 ) {
            callback({error: "Invalid class provided"});
            return;
        }

        url = '/top-' + reapi.static.classPlurals[Object.keys(reapi.static.classPlurals)[classes.indexOf(target.class)]].toLowerCase() + ( (CurrentPage.toString().match(/^[1-9]01$/)) ? '/' + CurrentPage : '' );

    }

    target.url = url;

    reapi.io.get(url, false, function(jq, error) {

        if ( error === true ) {

            callback({error: "There was an error processing your request"});
            return;

        }

        reapi.get[list](jq, target, page, callback, req);

    }, req);

};

/**
 * @function
 * @param {string} ign
 * @param {object | function} target
 * @param {function} [callback]
 * @param {object} [req]
 * Returns data for the specified player
 */
reapi.get.player = function(ign, target, callback, req) {

    if ( typeof target === "function" ) {
        callback = target;
        target = {};
    }
    var url = '/player/' + ign;
    reapi.io.get(url, false, function(jq, error) {

        if ( error === true ) {

            callback({error: "There was an error processing your request"});
            return;

        }

        //  create the default object
        var result = {
            meta: {
                date: new Date().toLocaleString(),
                uri: '/player/' + ign
            },
            unknown: true,
            username: ign,
            summary: {
                characters: undefined,
                fame: undefined,
                fameRankText: undefined,
                fameRank: undefined,
                fameRankUrl: undefined,
                exp: undefined,
                expRankText: undefined,
                expRank: undefined,
                expRankUrl: undefined,
                accountRank: undefined,
                accountFame: undefined,
                accountFameRankText: undefined,
                accountFameRank: undefined,
                accountFameRankUrl: undefined,
                guild: undefined,
                guildUrl: undefined,
                guildRank: undefined,
                created: undefined,
                lastseen: undefined
            },
            chars: {}
        };

        var self;

        if ( jq('ul.player-not-found').length === 0 ) {

            if ( target.condensed !== true ) {

                //  parse summary
                var Desc = jq('div.well.description > div.description-line');
                result.summary.description = [];
                for (var i3 = 0; i3 < Desc.length; i3++) {

                    self = jq(Desc[i3]);
                    result.summary.description.push(self.text());

                }

                //  parse characters
                var CharData = jq('div.table-responsive table tbody tr');
                for (var index = 0; index < CharData.length; index++) {

                    self = jq(CharData[index]);
                    var tmp = {};
                    var TdIndex = 0;
                    var HasPets = false;
                    if (self.find('td:first-child').html().length < 1 || self.find('td:first-child span[class="pet"]').length > 0) HasPets = true;
                    if (HasPets === false) TdIndex--;

                    var pet = self.find('td:first-child span[class="pet"]');

                    var CharClass = self.find('td:nth-child(' + Number(3 + TdIndex) + ')').text();
                    result.chars[CharClass] = reapi.get.cleanResults({
                        pet: ((self.find('td:first-child span[class="pet"]').length === 1) ? pet[0].getAttribute('data-item') : undefined),
                        skin: reapi.get.skinData(self.find('td:nth-child(' + Number(2 + TdIndex) + ') a[class="character"]'), target),
                        equipment: reapi.get.equipData(self, 9 + TdIndex, target),
                        level: Number(self.find('td:nth-child(' + Number(4 + TdIndex) + ')').text()),
                        cqc: self.find('td:nth-child(' + Number(5 + TdIndex) + ')').text(),
                        fame: Number(self.find('td:nth-child(' + Number(6 + TdIndex) + ')').text().replace(reapi.config.regex.renumbers, '')),
                        exp: Number(self.find('td:nth-child(' + Number(7 + TdIndex) + ')').text().replace(reapi.config.regex.renumbers, '')),
                        place: Number(self.find('td:nth-child(' + Number(8 + TdIndex) + ')').text().replace(reapi.config.regex.renumbers, '')),
                        placeUrl: self.find('td:nth-child(' + Number(8 + TdIndex) + ') a').attr('href'),
                        stats: {
                            maxed: self.find('td:nth-child(' + Number(10 + TdIndex) + ')').text(),
                            stats: {
                                hp: undefined,
                                mp: undefined,
                                att: undefined,
                                def: undefined,
                                spd: undefined,
                                vit: undefined,
                                wis: undefined,
                                dex: undefined
                            },
                            bonuses: {
                                hp: undefined,
                                mp: undefined,
                                att: undefined,
                                def: undefined,
                                spd: undefined,
                                vit: undefined,
                                wis: undefined,
                                dex: undefined
                            }
                        }
                    }, target);

                    //  prefix placeUrl
                    if (typeof result.chars[CharClass].placeUrl === 'string') result.chars[CharClass].placeUrl = reapi.config.url + result.chars[CharClass].placeUrl;

                    //  stats data
                    tmp.stats = self.find('td:nth-child(' + Number(10 + TdIndex) + ') span[class="player-stats"]');
                    tmp.datastats = JSON.parse(tmp.stats.attr('data-stats'));
                    tmp.databonuses = JSON.parse(tmp.stats.attr('data-bonuses'));
                    var StatIndex = 0;
                    for (var i in result.chars[CharClass].stats.stats) {
                        if (result.chars[CharClass].stats.stats.hasOwnProperty(i)) {

                            result.chars[CharClass].stats.stats[i] = Number(tmp.datastats[StatIndex]);
                            result.chars[CharClass].stats.bonuses[i] = Number(tmp.databonuses[StatIndex]);
                            StatIndex++;

                        }
                    }

                }

            } else delete result.chars;

            //  parse summary
            var SummaryData = jq('.summary tbody tr');
            for (var i2 = 0; i2 < SummaryData.length; i2++) {

                result.unknown = false;
                self = jq(SummaryData[i2]);
                var name = self.find('td:first-child').text();
                var value = self.find('td:nth-child(2)').text();

                if (name === "Characters") {

                    result.summary.characters = Number(value);

                } else if (name === "Fame") {

                    result.summary.fame = Number(self.find('td:nth-child(2) span').text());
                    result.summary.fameRankText = self.find('td:nth-child(2) a').text();
                    result.summary.fameRank = Number(result.summary.fameRankText.match(/^([0-9]*).*$/)[1]);
                    result.summary.fameRankUrl = self.find('td:nth-child(2) a').attr('href');

                } else if (name === "Exp") {

                    //  exp information
                    result.summary.exp = Number(self.find('td:nth-child(2) span').text());
                    result.summary.expRankText = self.find('td:nth-child(2) a').text();
                    result.summary.expRank = Number(result.summary.expRankText.match(/^([0-9]*).*$/)[1]);
                    result.summary.expRankUrl = self.find('td:nth-child(2) a').attr('href');

                } else if (name === "Rank") {

                    result.summary.accountRank = Number(self.find('td:nth-child(2) div[class="star-container"]').text());

                } else if (name === "Account fame") {

                    //  account fame information
                    result.summary.accountFame = Number(self.find('td:nth-child(2) span').text());
                    result.summary.accountFameRankText = self.find('td:nth-child(2) a').text();
                    result.summary.accountFameRank = Number(result.summary.accountFameRankText.match(/^([0-9]*).*$/)[1]);
                    result.summary.accountFameRankUrl = self.find('td:nth-child(2) a').attr('href');
                    if (result.summary.accountFameRank === "") result.summary.accountFameRank = self.find('td:nth-child(2)').text().match(/^.*\(([0-9]*).*$/)[1];

                } else if (name === "Guild") {

                    result.summary.guild = self.find('td:nth-child(2) a').text();
                    result.summary.guildUrl = reapi.config.url + '/guild' + self.find('td:nth-child(2) a').attr('href');

                } else if (name === "Guild Rank") {

                    result.summary.guildRank = value;

                } else if (name === "Created") {

                    result.summary.created = value;

                } else if (name === "Last seen") {

                    result.summary.lastseen = value;

                }

            }

        } else {

            delete result.summary;
            delete result.chars;

        }

        callback(result);

    }, req);

};

/**
 * @function
 * @param {string} html
 * @returns {jquery}
 * Parse an HTML input and return a jQuery object
 */
reapi.tools.jq = function(html) {

    var dom = new JSDOM(html);
    var jq = (require('jquery'))(dom.window);
    return jq;

};

/**
 * @function
 * @param {string} message
 * @param {string} [log]
 * Append a message to a specified log file
 */
reapi.tools.writelog = function(message, log) {

    if ( ['undefined', 'string'].indexOf(typeof log) === -1 ) return;
    if ( typeof log === 'string' && log.match(/^[a-z0-9-_]*$/i) === null ) return;
    if ( typeof log === 'undefined' ) log = 'system';
    console.log(message);
    fs.appendFile(reapi.config.logpath + '/' + log + '.log', message + '\n', function(err) {});

};

/**
 * @function
 * @param {string | number | array | object} message
 * @param {string} [log]
 * @param {object} [req]
 * Write a system log message
 */
reapi.tools.systemlog = function(message, log, req) {

    if ( ['undefined', 'string'].indexOf(typeof log) === -1 ) return;
    if ( typeof log === 'string' && log.match(/^[a-z0-9-_]*$/i) === null ) return;
    if ( typeof log === 'undefined' ) log = 'system';

    var args = {
        '_type': log,
        'runtimeID': undefined,
        'request_time': (new Date()).toLocaleString(),
        'message': message
    };

    if (
        typeof req === 'object' &&
        typeof req.data === 'object' &&
        typeof req.data.runtimeID === 'string'
    ) args.runtimeID = req.data.runtimeID;

    var data = JSON.stringify(args);
    reapi.tools.writelog(data, log);

};

/**
 * @function
 * @param {*} value
 * @param {function} callback
 * @param {object} [req]
 * Set/get cache testing with option set value
 */
reapi.tools.cachetest = function(value, callback, req) {

    if ( typeof value === 'string' ) reapi.cache.set('cachetest', value, 300000, req);
    reapi.cache.get('cachetest', function(data) {
        callback({
            key: 'cachetest',
            value: value,
            date: new Date(),
            received: data
        });
    }, req);

};

/**
 * @function
 * @param {string} key
 * @param {boolean} type
 * @param {function} [callback]
 * @param {object} [req]
 * Obtain or release a lock on a cache file
 */
reapi.cache.lock = function(key, type, callback, req) {

    if ( reapi.config.cache.enabled === false ) {
        callback(true);
        return;
    }

    redis.get('lock:' + reapi.config.cache.prefix + key).then(function(result) {

        if ( type === false ) {

            reapi.tools.systemlog('unlock on lock:' + reapi.config.cache.prefix + key, 'caching', req);
            redis.del(reapi.config.cache.prefix + key);
            if ( typeof callback === 'function' ) callback(true);

        } else if ( type === true ) {

            if (
                result === undefined ||
                (Date.now() - result) > reapi.config.cache.lockTtl
            ) {

                reapi.tools.systemlog('lock on lock:' + reapi.config.cache.prefix + key, 'caching', req);
                redis.set('lock:' + reapi.config.cache.prefix + key, Date.now());
                callback(true);

            } else {

                reapi.tools.systemlog('cannot lock on lock:' + reapi.config.cache.prefix + key, 'caching', req);
                callback(false);

            }

        }

    });

};

/**
 * @function
 * @param {string} key
 * @param {*} value
 * @param {number | string} [ttl]
 * @param {object} [req]
 * @returns {*}
 * Sets a cache key with an optional ttl
 */
reapi.cache.set = function(key, value, ttl, req) {

    if ( reapi.config.cache.enabled === false ) {
        callback();
        return;
    }

    if ( !ttl ) ttl = 0;
    if ( typeof ttl === 'string' ) ttl = parseInt(ttl, 10);
    if ( typeof ttl !== 'number' ) return;

    var jv = JSON.stringify(value);
    var prefix = reapi.config.cache.prefix || '';
    var object = {
        key: key,
        value: jv,
        hash: [
            crypto.createHmac('sha256', jv).digest('hex'),
            crypto.createHmac('sha512', jv).digest('hex')
        ],
        ts: Date.now(),
        ttl: ttl,
        expires: ( (ttl === 0) ? 0 : (Date.now()+ttl) ),
        fresh: true
    };

    reapi.tools.systemlog('set: ' + prefix + key, 'caching', req);
    return redis.set(prefix + key, JSON.stringify(object));

};

/**
 * @function
 * @param {string} key
 * @param {function} callback
 * @param {object} [req]
 * Reads a key from cache and validates for checksum and expiration time
 */
reapi.cache.get = function(key, callback, req) {

    if ( reapi.config.cache.enabled === false ) {
        callback();
        return;
    }

    var prefix = reapi.config.cache.prefix || '';
    reapi.tools.systemlog('get: ' + prefix + key, 'caching', req);
    redis.get(prefix + key).then(function(data) {

        try {
            data = JSON.parse(data);
        } catch(e) {
            callback();
            return;
        }

        //console.log(data);
        var jv;
        var result;

        try {
            jv = JSON.parse(data.value);
        } catch(e) {
            callback();
            return;
        }

        //  match checksums
        if (
            crypto.createHmac('sha256', data.value).digest('hex') === data.hash[0] ||
            crypto.createHmac('sha512', data.value).digest('hex') === data.hash[1]
        ) {

            //  check expiration
            result = jv;
            if (
                data.expires > 0 &&
                Date.now() >= data.expires
            ) data.fresh = false;

        }

        callback({
            fresh: data.fresh,
            value: result
        });

    }).catch(function(error) {

        callback();

    });

};

module.exports = reapi;
