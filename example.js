/**
 * smartFritz - Fritz goes smartHome
 *
 * AVM SmartHome nodeJS Control - for AVM Fritz!Box and Dect200 Devices
 *
 * @author Andreas Goetz <cpuidle@gmx.de>
 *
 * Examples. To use install xml2json:
 *    npm install xml2json
 */

var fritz = require('./smartfritz.js');
var Promise = require('bluebird');
var parser = require('xml2json');

var username = DEFINE HERE;
var password = DEFINE HERE;

/*
 * Polyfills
 */

// get an outlet or thermostat's temperature
function getTemperature(sid, ain, options)
{
    return fritz.getDeviceListInfo(sid, options).then(function(devicelistinfo) {
        // xml to json object
        var device = parser.toJson(devicelistinfo, {object:true}).devicelist.device.filter(function(device) {
            return device.identifier.replace(/\s/g, '') == ain;
        });

        if (device.length) {
            return Promise.resolve(parseFloat(device[0].temperature.celsius) / 10); // °C
        }
        else {
            return Promise.fail();
        }
    });
}

fritz.getSessionID(username, password).then(function(sid) {
    console.log("SID: " + sid);

    // display switch information
    fritz.getSwitchList(sid).then(function(switches) {
        console.log("Switches: " + switches);

        if (switches.length) {
            fritz.getSwitchName(sid, switches[0]).then(function(name) {
                console.log("Switch name [" + switches[0] + "]: " + name);

                fritz.getSwitchPresence(sid, switches[0]).then(function(presence) {
                    console.log("Switch presence [" + switches[0] + "]: " + presence);

                    fritz.getSwitchState(sid, switches[0]).then(function(state) {
                        console.log("Switch state [" + switches[0] + "]: " + state);
                    });

                    fritz.getSwitchTemperature(sid, switches[0]).then(function(temp) {
                        console.log("Switch temperature [" + switches[0] + "]: " + temp);
                    }).catch(function() {
                        console.log("Switch temperature not supported on this Fritz!OS version.");

                        getTemperature(sid, switches[0]).then(function(temp) {
                            console.log("Switch temperature (alt. method) [" + switches[0] + "]: " + temp + "°C");
                        });
                    });
                });
            });
        }
    });

    // display thermostat information
    fritz.getDeviceListInfo(sid).then(function(devicelistinfo) {
        // xml to json object
        var devices = parser.toJson(devicelistinfo, {object:true}).devicelist.device;

        // get thermostats- right now they're only available via the XML api
        var thermostats = devices.filter(function(device) {
            return device.productname == 'Comet DECT';
        }).map(function(device) {
            // fix ain
            return device.identifier.replace(/\s/g, '');
        });

        console.log("Thermostats: " + thermostats);

        if (thermostats.length) {
            fritz.getSwitchTemperature(sid, thermostats[0]).then(function(temp) {
                console.log("Thermostat temperature [" + switches[0] + "]: " + temp);
            }).catch(function() {
                console.log("Thermostat temperature not supported on this Fritz!OS version.");

                getTemperature(sid, thermostats[0]).then(function(temp) {
                    console.log("Thermostat temperature (alt. method) [" + thermostats[0] + "]: " + temp + '°C');
                });
            });

            fritz.getTempTarget(sid, thermostats[0]).then(function(temp) {
                console.log("Target temperature [" + thermostats[0] + "]: " + temp + '°C');
            });
        }
    });
});
