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
var request = require('request').defaults({ strictSSL: false });
var querystring = require('querystring');

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
    options = extend({url: 'http://fritz.box'}, options||{});

    var req = extend({}, options);
    req.url += path || '/webservices/homeautoswitch.lua?0=0';
    if (sid)
        req.url += '&sid=' + sid;
    if (command)
        req.url += '&switchcmd=' + command;
    if (ain)
        req.url += '&ain=' + ain;

    return new Promise(function(resolve, reject) {
        request(req, function(error, response, body) {
            if (error || !(/^2/.test('' + response.statusCode))) {
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
};

// #############################################################################

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

// get the switch list
module.exports.getSwitchList = function(sid, options)
{
    return executeCommand(sid, 'getswitchlist', null, options);
};

// get switch state
module.exports.getSwitchState = function(sid, ain, options)
{
    return executeCommand(sid, 'getswitchstate', ain, options);
};

// turn an outlet on. returns the state the outlet was set to
module.exports.setSwitchOn = function(sid, ain, options)
{
    return executeCommand(sid, 'setswitchon', ain, options);
};

// turn an outlet off. returns the state the outlet was set to
module.exports.setSwitchOff = function(sid, ain, options)
{
    return executeCommand(sid, 'setswitchoff', ain, options);
};

// get the total enery consumption. returns the value in Wh
module.exports.getSwitchEnergy = function(sid, ain, options)
{
    return executeCommand(sid, 'getswitchenergy', ain, options);
};

// get the current enery consumption of an outlet. returns the value in mW
module.exports.getSwitchPower = function(sid, ain, options)
{
    return executeCommand(sid, 'getswitchpower', ain, options);
};

// get detailed device information (XLM)
module.exports.getDeviceListInfo = function(sid, options)
{
    return executeCommand(sid, 'getdevicelistinfos', null, options);
};

module.exports.getGuestWlan = function(sid, options)
{
    // return Promise.resolve("NOT IMPLEMENTED");

    return executeCommand(sid, null, null, options, '/wlan/guest_access.lua').then(
        function(data) {
            console.log("THEN");
            var settings = { };
            console.log(data);
            return Promise.resolve("NOT IMPLEMENTED");

        //     settings.enabled = /"wlan:settings\/guest_ap_enabled"\] = "([^"]*)"/g.exec(data)[1]=="1";
        //     settings.ssid = /"wlan:settings\/guest_ssid"\] = "([^"]*)"/g.exec(data)[1];
        //     settings.wpakey = /"wlan:settings\/guest_pskvalue"\] = "([^"]*)"/g.exec(data)[1];
        //     settings.security = "0";
        //     settings.modus = /"wlan:settings\/guest_encryption"\] = "([^"]*)"/g.exec(data)[1];
        //     settings.timeout = /"wlan:settings\/guest_timeout"\] = "([^"]*)"/g.exec(data)[1];
        //     settings.timeoutactive = /"wlan:settings\/guest_timeout_active"\] = "([^"]*)"/g.exec(data)[1];

        //     return Promise.resolve(settings);
        }
    );
};

module.exports.setGuestWlan = function(sid, enable, options)
{
    return Promise.resolve("NOT IMPLEMENTED");

    return executeCommand(sid, null, null, options, '/wlan/guest_access.lua').then(function(data) {
        console.log(data);

        // settings.enabled = /"wlan:settings\/guest_ap_enabled"\] = "([^"]*)"/g.exec(data)[1]=="1";
        // settings.ssid = /"wlan:settings\/guest_ssid"\] = "([^"]*)"/g.exec(data)[1];
        // settings.wpakey = /"wlan:settings\/guest_pskvalue"\] = "([^"]*)"/g.exec(data)[1];
        // settings.security = "0";
        // settings.modus = /"wlan:settings\/guest_encryption"\] = "([^"]*)"/g.exec(data)[1];
        // settings.timeout = /"wlan:settings\/guest_timeout"\] = "([^"]*)"/g.exec(data)[1];
        // settings.timeoutactive = /"wlan:settings\/guest_timeout_active"\] = "([^"]*)"/g.exec(data)[1];

        options.ssid || (options.ssid = /"wlan:settings\/guest_ssid"\] = "([^"]*)"/g.exec(data)[1]);
        options.wpakey || (options.wpakey = /"wlan:settings\/guest_pskvalue"\] = "([^"]*)"/g.exec(data)[1]);
        options.security || (options.security = "0");
        options.modus || (options.modus = /"wlan:settings\/guest_encryption"\] = "([^"]*)"/g.exec(data)[1]);
        options.timeout || (options.timeout = /"wlan:settings\/guest_timeout"\] = "([^"]*)"/g.exec(data)[1]);
        options.timeoutactive || (options.timeoutactive = /"wlan:settings\/guest_timeout_active"\] = "([^"]*)"/g.exec(data)[1]);

        var parameters = {
            "guest_ssid": options.ssid,
            "wlan_security": options.security,
            "wpa_key": options.wpakey,
            "wpa_modus": options.modus,
            "down_time_activ": options.timeoutactive,
            "down_time_value": options.timeout,
            "btnSave": ""
        };

        if (enable) {
            parameters.activate_guest_access = "on";
        }

        var post_data = querystring.stringify(parameters);

        var reg = extend({}, options, { method: 'POST', headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': post_data.length
        }});

        return executeCommand(sid, null, null, req, '/wlan/guest_access.lua').then(function(data) {
            var settings = { };
            console.log(data);
            return Promise.resolve("NOT IMPLEMENTED");

            settings.enabled = /"wlan:settings\/guest_ap_enabled"\] = "([^"]*)"/g.exec(data)[1]=="1";
            settings.ssid = /"wlan:settings\/guest_ssid"\] = "([^"]*)"/g.exec(data)[1];
            settings.wpakey = /"wlan:settings\/guest_pskvalue"\] = "([^"]*)"/g.exec(data)[1];
            settings.security = "0";
            settings.modus = /"wlan:settings\/guest_encryption"\] = "([^"]*)"/g.exec(data)[1];
            settings.timeout = /"wlan:settings\/guest_timeout"\] = "([^"]*)"/g.exec(data)[1];
            settings.timeoutactive = /"wlan:settings\/guest_timeout_active"\] = "([^"]*)"/g.exec(data)[1];

            return Promise.resolve(settings);
        });
    });
};
