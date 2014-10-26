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
var querystring = require('querystring');
var htmlParser = require('html-parser');

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

/**
 * Parse guest WLAN form settings
 */
function parseHTML(html)
{
    var settings = {};
    var blacklist = ['autoupdate'];
    var isInput, inputName, inputType, inputValue, isSelect, inputSelectedOption;

    htmlParser.parse(html, {
        openElement: function(name) { 
            isInput = ['input'].indexOf(name) >= 0;
            isSelect = ['select', 'option'].indexOf(name) >= 0;
        },
        closeOpenedElement: function(name, token, unary) { 
            if (inputName) {
                if (isInput || inputSelectedOption) {
                    if (isInput && inputType == 'checkbox' && inputValue == null) inputValue = false;
                    if (blacklist.indexOf(inputName) < 0)
                        settings[inputName] = inputValue;
                    isInput = isSelect = inputName = inputType = inputValue = inputSelectedOption = null;
                }
            }
        },
        attribute: function(name, value) { 
            if (isInput || isSelect) {
                switch (name) {
                    case 'name':
                        inputName = value;
                        break;
                    case 'type':
                        inputType = value;
                        break;
                    case 'value':
                        inputValue = value;
                        break;
                    case 'checked':
                        inputValue = true;
                        break;
                    case 'selected':
                        inputSelectedOption = true;
                        break;
                }
            } 
        },
    });

    return settings;
}

// #############################################################################

// run command for selected device
module.exports.executeCommand = executeCommand;

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

// get detailed device information (XLM)
module.exports.getDeviceListInfo = function(sid, options)
{
    return executeCommand(sid, 'getdevicelistinfos', null, options);
};

module.exports.getGuestWlan = function(sid, options)
{
    return executeCommand(sid, null, null, options, '/wlan/guest_access.lua?0=0').then(function(body) {
        return Promise.resolve(parseHTML(body));
    });
};

module.exports.setGuestWlan = function(sid, enable, options)
{
    return executeCommand(sid, null, null, options, '/wlan/guest_access.lua?0=0').then(function(body) {
        var settings = parseHTML(body);

        // checkboxes
        for (property in settings) {
            if (settings[property] === true)
                settings[property] = 'on'
            else if (settings[property] === false)
                delete settings[property];
        }

        if (enable)
            settings.activate_guest_access = 'on'
        else
            delete settings.activate_guest_access;

        var req = extend({ 
            url: 'http://fritz.box', 
            method: 'POST',
            form: settings
        }, options || {});
        req.url += '/wlan/guest_access.lua?sid=' + sid;

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
                    resolve(parseHTML(body.trim()));
                }
            });
        });
    });
};
