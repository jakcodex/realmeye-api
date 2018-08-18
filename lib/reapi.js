var Curl = require('node-libcurl').Curl;
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const util = require('util');
var $ = null;
var realmeyeapi = {
    init: false,
    config: {regex: {}, cache: {}},
    static: {},
    io: {js: {}},
    get: {},
    char: {},
    error: {}
};

//  configuration
realmeyeapi.config.version = '0.1.0';
realmeyeapi.config.url = 'https://www.realmeye.com';
realmeyeapi.config.listenPort = 3000;
realmeyeapi.config.curlOpts = {
    'USERAGENT': 'Jakcodex/RealmeyeAPI - https://reapi.jakcodex.io/about'
};
realmeyeapi.config.regex.renumbers = new RegExp(/(&.*;)/);
realmeyeapi.config.regex.lastpage = new RegExp(/^\/.*?\/([0-9]*)01.*?$/);

//  other things
realmeyeapi.static.classPlurals = {
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
    Sorcerer: 'Sorcerers',
    Trickster: 'Tricksters',
    Warrior: 'Warriors',
    Wizard: 'Wizards'
};

realmeyeapi.static.classIds = {
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
    805: 'Sorcerer',
    804: 'Trickster',
    797: 'Warrior',
    782: 'Wizard'
};

realmeyeapi.io.jq = function(html) {

    var dom = new JSDOM(html);
    var jq = (require('jquery'))(dom.window);
    return jq;

};

realmeyeapi.io.get = function(url, raw, callback) {

    if ( typeof raw === 'function' ) {
        callback = raw;
        raw = undefined;
    }

    url = ( raw === true ) ? url : (realmeyeapi.config.url + url);
    console.log('realmeyeapi.io.get', url);

    var curl = new Curl(),
        close = curl.close.bind(curl);

    curl.setOpt('URL', url);
    curl.setOpt('USERAGENT', realmeyeapi.config.curlOpts.USERAGENT);
    curl.setOpt('FOLLOWLOCATION', true);

    curl.on('end', function(statusCode, html, headers) {

        if(statusCode === 200){

            if ( raw === true ) {
                callback(html);
                return;
            }

            callback(realmeyeapi.io.jq(html));

        } else{
            //some error handling
            callback(undefined, true);
        }

    });

    curl.on('error', curl.close.bind(curl));
    curl.perform();

};

//  create and return an error object to the callback
realmeyeapi.error.object = function(callback, e, method, args, message) {

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

//  find last page id for non-standard 10-page lists
realmeyeapi.get.findLastPage = function(jq, LastPage) {

    var data = jq('nav.text-center ul li');
    for ( var index = 0; index < data.length; index++ ) {

        var self = jq(data[index]);
        if ( self.text() === 'Last' ) {
            LastPage.page = Number(self.find('a').attr('href').match(realmeyeapi.config.regex.lastpage)[1]);
            if ( typeof LastPage.page !== 'number' ) LastPage.page = 10;
        }

    }

};

//  parse a skin list
realmeyeapi.get.skinData = function(data, target) {

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
        result.url = realmeyeapi.config.url + data.attr('href');
    } else {
        result.url = realmeyeapi.config.url +
            '/top-characters-with-outfit/' +
            result.class + '/' +
            result.skin + '/' +
            result['clothing-dye-id'] + '/' +
            result['accessory-dye-id'];
    }

    return result;

};

//  parse an equipment list
realmeyeapi.get.equipData = function(self, TdIndex, target) {

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

                result[i].url = realmeyeapi.config.url + tmp.find('a').attr('href');
                result[i].title = tmp.find('span[class="item"]').attr('title');

            }

            EquipmentIndex++;

        }

    }

    return result;

};

//  remove null and undefined entries
realmeyeapi.get.cleanResults = function(data, target) {

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

//  display the most recent deaths
realmeyeapi.get.recentdeaths = function(jq, target, page, callback) {

    //  recent deaths has a variable last page (could be 5, could be 1550, etc)
    var LastPage = {page: 10};
    realmeyeapi.get.findLastPage(jq, LastPage);
    LastPage = ( typeof LastPage.page === 'number' ) ? LastPage.page : 10;
    if ( typeof target.options === 'undefined' ) target.options = {};
    var result = {
        meta: {
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

        realmeyeapi.error.object(callback, {}, 'realmeyeapi.get.recentdeaths', $.extend(true, {}, {page: page}, target), 'Specified page does not exist.');
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

            result.chars.push(realmeyeapi.get.cleanResults({
                grave: rank,
                username: self.find('td:nth-child(2) a').text(),
                url: realmeyeapi.config.url + self.find('td:nth-child(2) a').attr('href'),
                class: realmeyeapi.static.classIds[self.find('td:nth-child(1) span[class="character"]').data('data-class')],
                diedon: self.find('td:nth-child(3)').text(),
                killedby: self.find('td:nth-child(8)').text(),
                basefame: Number(self.find('td:nth-child(4)').text().replace(realmeyeapi.config.regex.renumbers, '')),
                totalfame: Number(self.find('td:nth-child(5)').text().replace(realmeyeapi.config.regex.renumbers, '')),
                bonuses: JSON.parse(self.find('td:nth-child(5) span.total-fame').attr('data-bonuses')),
                stats: self.find('td:nth-child(7)').text(),
                skin: realmeyeapi.get.skinData(self.find('td:nth-child(1) span[class="character"]'), target),
                equipment: realmeyeapi.get.equipData(self, 6, target)
            }, target));

        }

    }

    result.meta.resultCount = result.chars.length;
    callback(result);

};

//  parse data for a top class list
realmeyeapi.get.class = function(jq, target, page, callback) {

    if ( typeof target === 'string' ) target = {url: null, class: target};
    var result = {
        meta: {
            date: new Date().toLocaleString(),
            uri: realmeyeapi.config.url + target.url,
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
            result.chars.push(realmeyeapi.get.cleanResults({
                rank: rank,
                username: self.find('td:nth-child(3) a').text(),
                url: realmeyeapi.config.url + self.find('td:nth-child(3) a').attr('href'),
                fame: Number(self.find('td:nth-child(4)').text().replace(realmeyeapi.config.regex.renumbers, '')),
                exp: Number(self.find('td:nth-child(5)').text().replace(realmeyeapi.config.regex.renumbers, '')),
                stats: self.find('td:nth-child(7)').text(),
                skin: realmeyeapi.get.skinData(self.find('td:nth-child(2) .character'), target),
                equipment: realmeyeapi.get.equipData(self, 6, target),
                lastseen: self.find('td:nth-child(8)').text(),
                server: server
            }, target));

        }

    }

    result.meta.resultCount = result.chars.length;
    callback(result);

};

//  initiate a list processing
realmeyeapi.get.list = function(list, target, page, callback) {

    if ( !page || page === false ) page = 0;
    if ( typeof realmeyeapi.get[list] === 'undefined' ) realmeyeapi.error.object(
        callback,
        null,
        'realmeyeapi.get.list',
        {list: list, target: target, page: page},
        'Invalid list provided'
    );

    page = Number(page);
    var CurrentPage = JSON.parse(page);
    var PageCap = 10;
    if ( list === 'recentdeaths' ) PageCap = 10000000;
    if ( typeof page === 'number' && page < PageCap && page > 0 ) CurrentPage = page.toString() + '01';

    var url = '';
    if ( list === 'recentdeaths' ) {
        url = '/recent-deaths' + ( (CurrentPage.toString().match(/^[1-9]01$/)) ? '/' + CurrentPage : '' );
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

        var classes = Object.keys(realmeyeapi.static.classPlurals);
        for ( var i2 = 0; i2 < classes.length; i2++ ) classes[i2] = classes[i2].toLowerCase();
        if ( classes.indexOf(target.toLowerCase()) === -1 ) {
            callback({error: "Invalid class provided"});
            return;
        }

        if ( typeof target === 'string' ) target = {url: url, class: target.toLowerCase()};
        url = '/top-' + realmeyeapi.static.classPlurals[Object.keys(realmeyeapi.static.classPlurals)[classes.indexOf(target.class)]].toLowerCase() + ( (CurrentPage.toString().match(/^[1-9]01$/)) ? '/' + CurrentPage : '' );

    }

    target.url = url;

    realmeyeapi.io.get(url , function(jq, error) {

        if ( error === true ) {

            callback({error: "There was an error processing your request"});
            return;

        }

        realmeyeapi.get[list](jq, target, page, callback);

    });

};

//  return player data
realmeyeapi.get.player = function(ign, target, callback) {

    if ( typeof target === "function" ) {
        callback = target;
        target = {};
    }
    var url = '/player/' + ign;
    realmeyeapi.io.get(url, function(jq, error) {

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
                result.chars[CharClass] = realmeyeapi.get.cleanResults({
                    pet: ((self.find('td:first-child span[class="pet"]').length === 1) ? pet[0].getAttribute('data-item') : undefined),
                    skin: realmeyeapi.get.skinData(self.find('td:nth-child(' + Number(2 + TdIndex) + ') a[class="character"]'), target),
                    equipment: realmeyeapi.get.equipData(self, 9 + TdIndex, target),
                    level: Number(self.find('td:nth-child(' + Number(4 + TdIndex) + ')').text()),
                    cqc: self.find('td:nth-child(' + Number(5 + TdIndex) + ')').text(),
                    fame: Number(self.find('td:nth-child(' + Number(6 + TdIndex) + ')').text().replace(realmeyeapi.config.regex.renumbers, '')),
                    exp: Number(self.find('td:nth-child(' + Number(7 + TdIndex) + ')').text().replace(realmeyeapi.config.regex.renumbers, '')),
                    place: Number(self.find('td:nth-child(' + Number(8 + TdIndex) + ')').text().replace(realmeyeapi.config.regex.renumbers, '')),
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
                if (typeof result.chars[CharClass].placeUrl === 'string') result.chars[CharClass].placeUrl = realmeyeapi.config.url + result.chars[CharClass].placeUrl;

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

            //  parse summary
            var SummaryData = jq('.summary tbody tr');
            for (var i2 = 0; i2 < CharData.length; i2++) {

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
                    result.summary.guildUrl = realmeyeapi.config.url + '/guild' + self.find('td:nth-child(2) a').attr('href');

                } else if (name === "Guild Rank") {

                    result.summary.guildRank = value;

                } else if (name === "Created") {

                    result.summary.created = value;

                } else if (name === "Last seen") {

                    result.summary.lastseen = value;

                }

            }

            //  parse summary
            var Desc = jq('div.well.description > div.description-line');
            result.summary.description = [];
            for (var i3 = 0; i3 < Desc.length; i3++) {

                self = jq(Desc[i3]);
                result.summary.description.push(self.text());

            }

        } else {

            delete result.summary;
            delete result.chars;

        }

        callback(result);

    });

};

module.exports = realmeyeapi;
