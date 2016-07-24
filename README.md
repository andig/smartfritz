# smartfritz

Node module to communicate with a AVM FritzBox and FRITZ!DECT 200 (smart home hardware) providing the following functions:

### General functions

- Get the session ID (`getSessionID`)
- Get device list as XML (`getDeviceListInfo`) >FritzOS 6.10
- Get device list (`getDeviceList`) >FritzOS 6.10
- Get device (`getDevice`) >FritzOS 6.10
- Get temperature (`getTemperature`)

### FRITZ!DECT 200 outlet functions

- Get list (`getSwitchList`)
- Get state (`getSwitchState`)
- Set on (`setSwitchOn`)
- Set off (`setSwitchOff`)
- Get power (`getSwitchPower`)
- Get energy (`getSwitchEnergy`)
- Get presence status (`getSwitchPresence`)
- Get name (`getSwitchName`)

For AVM FRITZ!DECT 200  control you need to know the actuator identification number (AIN) which can be obtained using `getSwitchList`.

### Comet DECT thermostat functions

Thermostat functions are only available as of FritzOS 6.36

- Get list (`getThermostatList`) - polyfill
- Set target temperature (`setTempTarget`), supports 'ON'/'OFF' to enable/disable thermostat
- Get target temperature (`getTempTarget`)
- Get comfort temperature (`getTempComfort`)
- Get night temperature (`getTempNight`)
- Get battery charge status (`getBatteryCharge`)

**Note** 

As of FritzOS 6.36 there is are no official function to obtain a list of thermostats, neither to get the thermostat's temperature. Also the switches `getSwitchTemperature()` function is not working in that firmware version.
For an alternative approach the `getTemperature()` polyfill function was added which supports both switches and thermostats.

### Wlan functions

- Get the guest wlan settings (`getGuestWlan`)
- Set the guest wlan (`setGuestWlan`)

**Note** 

`getGuestWlan` returns a structure containing all wifi settings found in the Fritz!Box UI. The `setGuestWlan` function accepts either a settings structure such as this or a single boolean value.

All functions have been tested on FritzOS 6.20/6.36/6.51 using the FritzBox 7390. The WLAN functions may be less stable.

### Deprecated functions

As of version 0.5.0 the `getSwitchTemperature` function has been replaced with `getTemperature` which works for outlets and thermostats both.


## Install

```bash
npm install smartfritz-promise
```

## How to use

Get the session ID default:
as URL "fritz.box" is used as default paramter
```js
var fritz = require('smartfritz-promise');

fritz.getSessionID("user", "password").then(function(sid) {
    console.log(sid);
});
```


Get the session ID with own URL:
use your Fritz!Box IP when "fritz.box" is not working.
```js
var moreParam = { url:"192.168.178.1" };
fritz.getSessionID("user", "password", moreParam).then(function(sid) {
    console.log(sid);
});
```

Get the Switch AID List:
```js
fritz.getSessionID("user", "password").then(function(sid) {
  console.log(sid);

  fritz.getSwitchList(sid).then(function(ains){
    console.log("Switches AINs: "+ains);
  });
});
```

## AHA-HTTP Interface

AHA - AVM Home Interface

https://fritz.box/webservices/homeautoswitch.lua?ain=<ain>&switchcmd=<cmd>&sid=<sid>

AHA-HTTP-Interface document 
http://avm.de/fileadmin/user_upload/Global/Service/Schnittstellen/AHA-HTTP-Interface.pdf

## Thanks to // Code base from:

* nischelwitzer for the basic js implementation (https://github.com/nischelwitzer/smartfritz)
* steffen.timm for the basic communication function
* thk4711 for the FRITZ!DECT 200 codes 
* AVM for providing the good AHA-HTTP interface document 
