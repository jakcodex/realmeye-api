var realmeyeapi = {
    init: false,
    config: {regex: {}, cache: {}},
    static: {},
    io: {},
    get: {},
    char: {},
    error: {}
};

//  configuration
realmeyeapi.config.version = '0.0.1';
realmeyeapi.config.url = 'https://www.realmeye.com';
realmeyeapi.config.ajaxOptions = {
    headers: {
        'X-Requested-With': 'Jakcodex/RealmeyeAPI v' + realmeyeapi.config.version,
        'X-Feedback': 'https://github.com/jakcodex/realmeye-api/FEEDBACK.md'
    }
};
realmeyeapi.config.regex.renumbers = new RegExp(/(&.*;)/);

//  something to consider: this could generate a lot of outbound requests to realmeye
//  maybe layering cloudfront between us and realmeye would reduce any potential nth loads
//  not implemented yet; just an idea
realmeyeapi.config.cache.proxy = false;
realmeyeapi.config.cache.proxyUrl = '';

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

realmeyeapi.io.get = function(url, callback) {

    console.log('realmeyeapi.io.get', realmeyeapi.config.url + url);
    callback($.ajax(realmeyeapi.config.url + url, realmeyeapi.config.ajaxOptions));

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

    console.log(error);
    callback(error);

};

realmeyeapi.get.recentdeaths = function(data, target, page, callback) {

    var jq = $(data);
    var LastPage = jq.find('nav.text-center ul li:last-child a').attr('href').match(/^.*?\/([0-9]*?)$/);
    LastPage = ( LastPage ) ? Number(LastPage[1]) : 10;  //  should loop thru li and determine actual LastPage if < 10
    var result = {
        query: {
            'bf': target.bf || 0,
            'ms': target.ms || 0
        },
        'nextPage': ( (page >= 0 && page < 9 ) ? Number(page)+1 : null ),
        'prevPage': ( (page > 0 && page < 10 ) ? Number(page)-1 : null ),
        'currPage': page,
        'lastPage': LastPage,
        chars: []
    };

    //  I should probably not rely on this table id
    jq.find('table[id="d"] tbody tr').each(function(index) {

        var tmp = {};
        var rank = index+1;
        if ( page > 0 ) rank = rank+(page*100);

        //  is user private?
        if ( $(this).find('td:nth-child(1) span[class="private-character"]').length > 0 ) {

            //  we can track backpacks!
            var push = {grave: rank, private: true};
            if ( $(this).find('td:nth-child(6) span:nth-child(5) a span[title="Backpack"]').length > 0 ) push.equipment = {backpack: {url: '/wiki/backpack', title: 'Backpack'}};
            result.chars.push(push);

        } else {

            result.chars.push({
                grave: rank,
                username: $(this).find('td:nth-child(2) a').text(),
                url: realmeyeapi.config.url + $(this).find('td:nth-child(2) a').attr('href'),
                diedon: $(this).find('td:nth-child(3)').text(),
                basefame: Number($(this).find('td:nth-child(4)').text().replace(realmeyeapi.config.regex.renumbers, '')),
                totalfame: Number($(this).find('td:nth-child(5)').text().replace(realmeyeapi.config.regex.renumbers, '')),
                stats: $(this).find('td:nth-child(7)').text(),
                skin: {
                    url: undefined,
                    class: undefined,
                    skin: undefined,
                    dye1: undefined,
                    dye2: undefined,
                    'accessory-dye-id': undefined,
                    'clothing-dye-id': undefined
                },
                equipment: {
                    weapon: {url: undefined, title: undefined},
                    ability: {url: undefined, title: undefined},
                    armor: {url: undefined, title: undefined},
                    ring: {url: undefined, title: undefined},
                    backpack: {url: undefined, title: undefined}
                },
                killedby: $(this).find('td:nth-child(8)').text()
            });

            //  skin data
            if ( tmp.skin = $(this).find('td:nth-child(1) span[class="character"]') ) {

                result.chars[index].skin.url = 'https://www.realmeye.com' + tmp.skin.attr('href');
                result.chars[index].skin.class = tmp.skin.attr('data-class');
                result.chars[index].skin.skin = tmp.skin.attr('data-skin');
                result.chars[index].skin.dye1 = tmp.skin.attr('data-dye1');
                result.chars[index].skin.dye2 = tmp.skin.attr('data-dye2');
                result.chars[index].skin['accessory-dye-id'] = tmp.skin.attr('data-accessory-dye-id');
                result.chars[index].skin['clothing-dye-id'] = tmp.skin.attr('data-clothing-dye-id');

            }

            //  equipment data
            var EquipmentIndex = 1;
            for ( var i in result.chars[index].equipment ) {

                if ( result.chars[index].equipment.hasOwnProperty(i) ) {

                    tmp.equip = $(this).find('td:nth-child(6) span:nth-child(' + EquipmentIndex + ')');
                    result.chars[index].equipment[i].url = realmeyeapi.config.url + tmp.equip.find('a').attr('href');
                    result.chars[index].equipment[i].title = tmp.equip.find('span[class="item"]').attr('title');

                    EquipmentIndex++;

                }

            }

        }

    });

    callback(result);

};

//  parse data for a top class list
realmeyeapi.get.class = function(data, target, page, callback) {

    var jq = $(data);
    var result = {
        'class': target,
        'nextPage': ( (page >= 0 && page < 9 ) ? Number(page)+1 : null ),
        'prevPage': ( (page > 0 && page < 10 ) ? Number(page)-1 : null ),
        'currPage': page,
        chars: []
    };

    //  I should probably not rely on this table id
    jq.find('table[id="d"] tbody tr').each(function(index) {

        var tmp = {};
        var rank = index+1;
        if ( page > 0 ) rank = rank+(page*100);

        //  is user private?
        if ( $(this).find('td:nth-child(2) span[class="private-character"]').length > 0 ) {

            result.chars.push({rank: rank, private: true});

        } else {

            result.chars.push({
                username: $(this).find('td:nth-child(3) a').text(),
                url: realmeyeapi.config.url + $(this).find('td:nth-child(3) a').attr('href'),
                rank: rank,
                fame: Number($(this).find('td:nth-child(4)').text().replace(realmeyeapi.config.regex.renumbers, '')),
                exp: Number($(this).find('td:nth-child(5)').text().replace(realmeyeapi.config.regex.renumbers, '')),
                stats: $(this).find('td:nth-child(7)').text(),
                skin: {
                    url: undefined,
                    class: undefined,
                    skin: undefined,
                    dye1: undefined,
                    dye2: undefined,
                    'accessory-dye-id': undefined,
                    'clothing-dye-id': undefined
                },
                equipment: {
                    weapon: {url: undefined, title: undefined},
                    ability: {url: undefined, title: undefined},
                    armor: {url: undefined, title: undefined},
                    ring: {url: undefined, title: undefined},
                    backpack: {url: undefined, title: undefined}
                },
                lastseen: $(this).find('td:nth-child(8)').text(),
                server: $(this).find('td:nth-child(9)').text()
            });

            //  skin data
            if ( tmp.skin = $(this).find('td:nth-child(2) a[class="character"]') ) {

                result.chars[index].skin.url = 'https://www.realmeye.com' + tmp.skin.attr('href');
                result.chars[index].skin.class = tmp.skin.attr('data-class');
                result.chars[index].skin.skin = tmp.skin.attr('data-skin');
                result.chars[index].skin.dye1 = tmp.skin.attr('data-dye1');
                result.chars[index].skin.dye2 = tmp.skin.attr('data-dye2');
                result.chars[index].skin['accessory-dye-id'] = tmp.skin.attr('data-accessory-dye-id');
                result.chars[index].skin['clothing-dye-id'] = tmp.skin.attr('data-clothing-dye-id');

            }

            //  equipment data
            var EquipmentIndex = 1;
            for ( var i in result.chars[index].equipment ) {

                if ( result.chars[index].equipment.hasOwnProperty(i) ) {

                    tmp.equip = $(this).find('td:nth-child(6) span:nth-child(' + EquipmentIndex + ')');
                    result.chars[index].equipment[i].url = realmeyeapi.config.url + tmp.equip.find('a').attr('href');
                    result.chars[index].equipment[i].title = tmp.equip.find('span[class="item"]').attr('title');

                    EquipmentIndex++;

                }

            }

        }

    });

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
    if ( $.isNumeric(page) && page < PageCap && page > 0 ) CurrentPage = page.toString() + '01';

    var url = '';
    if ( list === 'recentdeaths' ) {
        url = '/recent-deaths' + ( (CurrentPage.toString().match(/^[1-9]01$/)) ? '/' + CurrentPage : '' );
        var count = 0;
        for ( var i in target ) {
            if ( target.hasOwnProperty(i) ) {

                if ( $.isNumeric(target[i]) ) {
                    count++;
                    url += ( count === 1 ) ? '?' : '&';
                    url += i + '=' + target[i];
                }

            }
        }

    }
    if ( list === 'class' ) url = '/top-' + realmeyeapi.static.classPlurals[target].toLowerCase() + ( (CurrentPage.toString().match(/^[1-9]01$/)) ? '/' + CurrentPage : '' );
    realmeyeapi.io.get(url , function(xhr) {

        xhr.done(function(data) {

            data = data.replace(/<img\b[^>]*>/ig, '');
            realmeyeapi.get[list](data, target, page, callback);

        });

        xhr.fail(function(e) {

            realmeyeapi.error.object(callback, e, 'realmeyeapi.get.list', {url: realmeyeapi.config.url + url, list: list, target: target, page: page});

        });

    });

};

//  return player data
realmeyeapi.get.player = function(ign, callback) {

    var url = '/player/' + ign;
    realmeyeapi.io.get(url, function(xhr) {

        xhr.done(function(data) {

            //  convert response html
            data = data.replace(/<img\b[^>]*>/ig, '');
            var jq = $(data);

            //  create the default object
            var result = {
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

            //  parse characters
            var HasPets = false;
            jq.find('div.table-responsive table tbody tr').each(function() {

                var tmp = {};
                var TdIndex = 0;
                if ( $(this).find('td:first-child').html().length < 1 || $(this).find('td:first-child span[class="pet"]').length > 0 ) HasPets = true;
                if ( HasPets === false ) TdIndex--;

                var CharClass = $(this).find('td:nth-child(' + Number(3+TdIndex) + ')').text();
                result.chars[CharClass] = {
                    pet: $(this).find('td:first-child span[class="pet"]').attr('title'),
                    skin: {
                        url: undefined,
                        class: undefined,
                        skin: undefined,
                        dye1: undefined,
                        dye2: undefined,
                        'accessory-dye-id': undefined,
                        'clothing-dye-id': undefined
                    },
                    level: Number($(this).find('td:nth-child(' + Number(4+TdIndex) + ')').text()),
                    cqc: $(this).find('td:nth-child(' + Number(4+TdIndex) + ')').text(),
                    fame: Number($(this).find('td:nth-child(' + Number(6+TdIndex) + ')').text().replace(realmeyeapi.config.regex.renumbers, '')),
                    exp: Number($(this).find('td:nth-child(' + Number(7+TdIndex) + ')').text().replace(realmeyeapi.config.regex.renumbers, '')),
                    place: Number($(this).find('td:nth-child(' + Number(8+TdIndex) + ')').text().replace(realmeyeapi.config.regex.renumbers, '')),
                    placeUrl: $(this).find('td:nth-child(' + Number(8+TdIndex) + ') a').attr('href'),
                    equipment: {
                        weapon: {url: undefined, title: undefined},
                        ability: {url: undefined, title: undefined},
                        armor: {url: undefined, title: undefined},
                        ring: {url: undefined, title: undefined},
                        backpack: {url: undefined, title: undefined}
                    },
                    stats: {
                        stats: {hp: undefined, mp: undefined, att: undefined, def: undefined, spd: undefined, vit: undefined, wis: undefined, dex: undefined},
                        bonuses: {hp: undefined, mp: undefined, att: undefined, def: undefined, spd: undefined, vit: undefined, wis: undefined, dex: undefined}
                    }
                };

                //  skin data
                if ( tmp.skin = $(this).find('td:nth-child(' + Number(2+TdIndex) + ') a[class="character"]') ) {

                    result.chars[CharClass].skin.url = 'https://www.realmeye.com' + tmp.skin.attr('href');
                    result.chars[CharClass].skin.class = tmp.skin.attr('data-class');
                    result.chars[CharClass].skin.skin = tmp.skin.attr('data-skin');
                    result.chars[CharClass].skin.dye1 = tmp.skin.attr('data-dye1');
                    result.chars[CharClass].skin.dye2 = tmp.skin.attr('data-dye2');
                    result.chars[CharClass].skin['accessory-dye-id'] = tmp.skin.attr('data-accessory-dye-id');
                    result.chars[CharClass].skin['clothing-dye-id'] = tmp.skin.attr('data-clothing-dye-id');

                }

                //  prefix placeUrl
                if ( typeof result.chars[CharClass].placeUrl === 'string' ) result.chars[CharClass].placeUrl = realmeyeapi.config.url + result.chars[CharClass].placeUrl;

                //  equipment data
                var EquipmentIndex = 1;
                for ( var i in result.chars[CharClass].equipment ) {

                    if ( result.chars[CharClass].equipment.hasOwnProperty(i) ) {

                        tmp.equip = $(this).find('td:nth-child(' + Number(9+TdIndex) + ') span:nth-child(' + EquipmentIndex + ')');
                        result.chars[CharClass].equipment[i].url = realmeyeapi.config.url + tmp.equip.find('a').attr('href');
                        result.chars[CharClass].equipment[i].title = tmp.equip.find('span[class="item"]').attr('title');

                        EquipmentIndex++;

                    }

                }

                //  stats data
                tmp.stats = $(this).find('td:nth-child(' + Number(10+TdIndex) + ') span[class="player-stats"]');
                tmp.datastats = JSON.parse(tmp.stats.attr('data-stats'));
                tmp.databonuses = JSON.parse(tmp.stats.attr('data-bonuses'));
                var StatIndex = 0;
                for ( var i in result.chars[CharClass].stats.stats ) {
                    if ( result.chars[CharClass].stats.stats.hasOwnProperty(i) ) {

                        result.chars[CharClass].stats.stats[i] = Number(tmp.datastats[StatIndex]);
                        result.chars[CharClass].stats.bonuses[i] = Number(tmp.databonuses[StatIndex]);
                        StatIndex++;

                    }
                }


            });

            //  parse summary
            jq.find('.summary tbody tr').each(function() {

                var name = $(this).find('td:first-child').text();
                var value = $(this).find('td:nth-child(2)').text();

                if ( name == "Characters") {

                    result.summary.characters = Number(value);

                } else if ( name == "Fame" ) {

                    result.summary.fame = Number($(this).find('td:nth-child(2) span').text());
                    result.summary.fameRankText = $(this).find('td:nth-child(2) a').text();
                    result.summary.fameRank = Number(result.summary.fameRankText.match(/^([0-9]*).*$/)[1]);
                    result.summary.fameRankUrl = $(this).find('td:nth-child(2) a').attr('href');

                } else if ( name == "Exp" ) {

                    //  exp information
                    result.summary.exp = Number($(this).find('td:nth-child(2) span').text());
                    result.summary.expRankText = $(this).find('td:nth-child(2) a').text();
                    result.summary.expRank = Number(result.summary.expRankText.match(/^([0-9]*).*$/)[1]);
                    result.summary.expRankUrl = $(this).find('td:nth-child(2) a').attr('href');

                } else if ( name == "Rank" ) {

                    result.summary.accountRank = Number($(this).find('td:nth-child(2) div[class="star-container"]').text());

                } else if ( name == "Account fame" ) {

                    //  account fame information
                    result.summary.accountFame = Number($(this).find('td:nth-child(2) span').text());
                    result.summary.accountFameRankText = $(this).find('td:nth-child(2) a').text();
                    result.summary.accountFameRank = Number(result.summary.accountFameRankText.match(/^([0-9]*).*$/)[1]);
                    result.summary.accountFameRankUrl = $(this).find('td:nth-child(2) a').attr('href');
                    if ( result.summary.accountFameRank === "" ) result.summary.accountFameRank = $(this).find('td:nth-child(2)').text().match(/^.*\(([0-9]*).*$/)[1];

                } else if ( name == "Guild" ) {

                    result.summary.guild = $(this).find('td:nth-child(2) a').text();
                    result.summary.guildUrl = realmeyeapi.config.url + '/guild' + $(this).find('td:nth-child(2) a').attr('href');

                } else if ( name == "Guild Rank" ) {

                    result.summary.guildRank = value;

                } else if ( name == "Created" ) {

                    result.summary.created = value;

                } else if ( name == "Last seen" ) {

                    result.summary.lastseen = value;

                }

            });

            callback(result);

        });

        xhr.fail(function(e) {

            realmeyeapi.error.object(callback, e, 'realmeyeapi.get.player', {url: realmeyeapi.config.url + url, ign: ign});

        });

    });

};