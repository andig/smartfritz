/**
 * smartFritz - Fritz goes smartHome
 *
 * AVM SmartHome nodeJS Control - for AVM Fritz!Box and Dect200 Devices
 *
 * @author Andreas Goetz <cpuidle@gmx.de>
 *
 * Forked from: https://github.com/nischelwitzer/smartfritz
 * nischi - first version: July 2014
 *
 * based on: Node2Fritz by steffen.timm on 05.12.13 for Fritz!OS > 05.50
 * and  thk4711 (code https://github.com/pimatic/pimatic/issues/38)
 * Documentation is at http://www.avm.de/de/Extern/files/session_id/AHA-HTTP-Interface.pdf
 */

var Promise = require('bluebird');
var request = require('request').defaults({ strictSSL: false }); // be less strict about SSL errors
var cheerio = require('cheerio');
var parser = require('xml2json-light');

// #############################################################################

function extend()
{
    for (var i=1; i<arguments.length; i++)
        for (var key in arguments[i])
            if (arguments[i].hasOwnProperty(key))
                arguments[0][key] = arguments[i][key];
    return arguments[0];
}

// run command for selected device
function executeCommand(sid, command, ain, options, path)
{
    var req = extend({ url: 'http://fritz.box' }, options || {});
    req.url += path || '/webservices/homeautoswitch.lua?0=0';

    if (sid)
        req.url += '&sid=' + sid;
    if (command)
        req.url += '&switchcmd=' + command;
    if (ain)
        req.url += '&ain=' + ain;

    return new Promise(function(resolve, reject) {
        request(req, function(error, response, body) {
            if (error || !(/^2/.test('' + response.statusCode)) || /action=".?login.lua"/.test(body)) {
                if (/action=".?login.lua"/.test(body)) {
                    // fake failed login if redirected to login page without HTTP 403
                    response.statusCode = 403;
                }
                reject({
                    error: error,
                    response: response,
                    options: req
                });
            }
            else {
                resolve(body.trim());
            }
        });
    });
}

/**
 * Parse guest WLAN form settings
 */
function parseHTML(html)
{
    $ = cheerio.load(html);
    var form = $('form');
    var settings = {};

    $('input', form).each(function(i, elem) {
        var val;
        var name = $(elem).attr('name');
        if (!name) return;

        switch ($(elem).attr('type')) {
            case 'checkbox':
                val = $(elem).attr('checked') == 'checked';
                break;
            default:
                val = $(elem).val();
        }
        settings[name] = val;
    });

    $('select option[selected=selected]', form).each(function(i, elem) {
        var val = $(elem).val();
        var name = $(elem).parent().attr('name');
        settings[name] = val;
    });

    return settings;
}

/**
 * Return devices array
 */
function getDeviceListInfoArray(sid, options) {
    return module.exports.getDeviceListInfo(sid, options).then(function(devicelistinfo) {
        var devices = parser.xml2json(devicelistinfo);
        // extract devices as array
        devices = [].concat((devices.devicelist || {}).device || []);
        return Promise.resolve(devices);
    });
}

/*
 * Temperature conversion
 */
const MIN_TEMP = 8;
const MAX_TEMP = 28;

function temp2api(temp)
{
    var res;

    if (temp == 'on' || temp === true)
        res = 254;
    else if (temp == 'off' || temp === false)
        res = 253;
    else {
        // 0.5C accuracy
        res = Math.round((Math.min(Math.max(temp, MIN_TEMP), MAX_TEMP) - 8) * 2) + 16;
    }

    return res;
}

function api2temp(param)
{
    if (param == 254)
        return 'on';
    else if (param == 253)
        return 'off';
    else {
        // 0.5C accuracy
        return (parseFloat(param) - 16) / 2 + 8;
    }
}

// #############################################################################

// run command for selected device
module.exports.executeCommand = executeCommand;

// supported temperature range
module.exports.MIN_TEMP = MIN_TEMP;
module.exports.MAX_TEMP = MAX_TEMP;

// functions bitmask
module.exports.FUNCTION_THERMOSTAT          = 1 << 6;  // Comet DECT, Heizkostenregler
module.exports.FUNCTION_ENERGYMETER         = 1 << 7;  // Energie Messgerät
module.exports.FUNCTION_TEMPERATURESENSOR   = 1 << 8;  // Temperatursensor
module.exports.FUNCTION_OUTLET              = 1 << 9;  // Schaltsteckdose
module.exports.FUNCTION_DECTREPEATER        = 1 << 10; // AVM DECT Repeater

/*
 * Session handling
 */

// get session id
module.exports.getSessionID = function(username, password, options)
{
    if (typeof username !== 'string') throw new Error('Invalid username');
    if (typeof password !== 'string') throw new Error('Invalid password');

    return executeCommand(null, null, null, options, '/login_sid.lua').then(function(body) {
        var challenge = body.match("<Challenge>(.*?)</Challenge>")[1];
        var challengeResponse = challenge +'-'+
            require('crypto').createHash('md5').update(Buffer(challenge+'-'+password, 'UTF-16LE')).digest('hex');
        var url = "/login_sid.lua?username=" + username + "&response=" + challengeResponse;

        return executeCommand(null, null, null, options, url).then(function(body) {
            sessionID = body.match("<SID>(.*?)</SID>")[1];
            return Promise.resolve(sessionID);
        });
    });
};

// check if session id is OK
module.exports.checkSession = function(sid, options)
{
    return executeCommand(sid, null, null, options, '/login_sid.lua').then(function(body) {
        sessionID = body.match("<SID>(.*?)</SID>")[1];
        return Promise.resolve(sessionID);
    });
};


/*
 * General functions
 */

// get detailed device information (XML)
module.exports.getDeviceListInfo = function(sid, options)
{
    return executeCommand(sid, 'getdevicelistinfos', null, options);
};

// get temperature- both switches and thermostats are supported
module.exports.getTemperature = function(sid, ain, options)
{
    return executeCommand(sid, 'gettemperature', ain, options).then(function(body) {
        return Promise.resolve(parseFloat(body) / 10); // °C
    });
};


/*
 * Switches
 */

// get the switch list
module.exports.getSwitchList = function(sid, options)
{
    return executeCommand(sid, 'getswitchlist', null, options).then(function(res) {
        return Promise.resolve(res.split(','));
    });
};

// get switch state
module.exports.getSwitchState = function(sid, ain, options)
{
    return executeCommand(sid, 'getswitchstate', ain, options).then(function(body) {
        return Promise.resolve(/^1/.test(body)); // true if on
    });
};

// turn an outlet on. returns the state the outlet was set to
module.exports.setSwitchOn = function(sid, ain, options)
{
    return executeCommand(sid, 'setswitchon', ain, options).then(function(body) {
        return Promise.resolve(/^1/.test(body)); // true if on
    });
};

// turn an outlet off. returns the state the outlet was set to
module.exports.setSwitchOff = function(sid, ain, options)
{
    return executeCommand(sid, 'setswitchoff', ain, options).then(function(body) {
        return Promise.resolve(/^1/.test(body)); // false if off
    });
};

// get the total enery consumption. returns the value in Wh
module.exports.getSwitchEnergy = function(sid, ain, options)
{
    return executeCommand(sid, 'getswitchenergy', ain, options).then(function(body) {
        return Promise.resolve(parseFloat(body)); // Wh
    });
};

// get the current enery consumption of an outlet. returns the value in mW
module.exports.getSwitchPower = function(sid, ain, options)
{
    return executeCommand(sid, 'getswitchpower', ain, options).then(function(body) {
        return Promise.resolve(parseFloat(body) / 1000); // W
    });
};

// get the outet presence status
module.exports.getSwitchPresence = function(sid, ain, options)
{
    return executeCommand(sid, 'getswitchpresent', ain, options).then(function(body) {
        return Promise.resolve(/^1/.test(body)); // true if present
    });
};

// get switch name
module.exports.getSwitchName = function(sid, ain, options)
{
    return executeCommand(sid, 'getswitchname', ain, options).then(function(body) {
        return Promise.resolve(body.trim());
    });
};


/*
 * Thermostats
 */

// get the switch list
module.exports.getThermostatList = function(sid, options)
{
    return getDeviceListInfoArray(sid, options).then(function(devices) {
        // get thermostats- right now they're only available via the XML api
        var thermostats = devices.filter(function(device) {
            return device.productname == 'Comet DECT';
        }).map(function(device) {
            // fix ain
            return device.identifier.replace(/\s/g, '');
        });

        return Promise.resolve(thermostats);
    });
};

// set target temperature (Solltemperatur)
module.exports.setTempTarget = function(sid, ain, temp, options)
{
    return executeCommand(sid, 'sethkrtsoll&param=' + temp2api(temp), ain, options).then(function(body) {
        // api does not return a value
        return Promise.resolve(temp);
    });
};

// get target temperature (Solltemperatur)
module.exports.getTempTarget = function(sid, ain, options)
{
    return executeCommand(sid, 'gethkrtsoll', ain, options).then(function(body) {
        return Promise.resolve(api2temp(body));
    });
};

// get nght temperature (Absenktemperatur)
module.exports.getTempNight = function(sid, ain, options)
{
    return executeCommand(sid, 'gethkrabsenk', ain, options).then(function(body) {
        return Promise.resolve(api2temp(body));
    });
};

// get comfort temperature (Komforttemperatur)
module.exports.getTempComfort = function(sid, ain, options)
{
    return executeCommand(sid, 'gethkrkomfort', ain, options).then(function(body) {
        return Promise.resolve(api2temp(body));
    });
};


/*
 * WLAN
 */

module.exports.getGuestWlan = function(sid, options)
{
    return executeCommand(sid, null, null, options, '/wlan/guest_access.lua?0=0').then(function(body) {
        return Promise.resolve(parseHTML(body));
    });
};

module.exports.setGuestWlan = function(sid, enable, options)
{
    return executeCommand(sid, null, null, options, '/wlan/guest_access.lua?0=0').then(function(body) {
        var settings = extend(parseHTML(body), {
            activate_guest_access: enable
        });

        // convert boolean to checkbox
        for (var property in settings) {
            if (settings[property] === true)
                settings[property] = 'on';
            else if (settings[property] === false)
                delete settings[property];
        }

        // additional settings to apply values
        settings = extend(settings, {
            'sid': sid,
            xhr: 1,
            apply: '',
            no_sidrenew: '',
            oldpage: '/wlan/guest_access.lua'
        });

        return new Promise(function(resolve, reject) {
            var req = extend({
                url: 'http://fritz.box',
                method: 'POST',
                form: settings
            }, options || {});
            req.url += '/data.lua';

            request(req, function(error, response, body) {
                if (error || !(/^2/.test('' + response.statusCode)) || /action=".?login.lua"/.test(body)) {
                    if (/action=".?login.lua"/.test(body)) {
                        // fake failed login if redirected to login page without HTTP 403
                        response.statusCode = 403;
                    }
                    reject({
                        error: error,
                        response: response,
                        options: req
                    });
                }
                else {
                    resolve(parseHTML(body));
                }
            });
        });
    });
};
