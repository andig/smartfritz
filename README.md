# smartfritz

Node module to communicate with a AVM FritzBox and FRITZ!DECT 200 (smart home hardware) providing the following functions:

### Sesson handling

- Get the session ID (getSessionID)

### Device list

- Get DeviceListInfos as XML (getDeviceListInfos) >FritzOS 6.10

### FRITZ!DECT 200 outlet functions

- Get switch list (getSwitchList)
- Get switch state (getSwitchState)
- Set switch oN (setSwitchOn)
- Set switch oFF (setSwitchOff)
- Get switch power (getSwitchPower)
- Get switch energy (getSwitchEnergy)
- Get switch temperature (getSwitchTemperature- falls back to getTemperature if not supported by firmware)
- Get switch presence status (getSwitchPresence)
- Get switch name (getSwitchName)

For AVM FRITZ!DECT 200  control you need to know the actuator identification number (AIN) which can be obtained using `getSwitchList`.

### Wlan functions

- Set the guest wlan (setGuestWLan)
- Get the guest wlan settings (getGuestWLan)

### Comet DECT thermostat functions

Thermostat functions are only available as of FritzOS 6.36

- Get thermostat list (getThermostatList) - polyfill
- Get thermostat temperature (getTemperature) - polyfill using getDeviceListInfos XML api internally
- Set target temperature (setTempTarget), supports 'ON'/'OFF' to enable/disable thermostat
- Get target temperature (getTempTarget)
- Get comfort temperature (getTempComfort)
- Get night temperature (getTempNight)

**Note** as of FritzOS 6.36 there is are no official function to obtain a list of thermostats, neither to get the thermostat's temperature. Also the switches `getSwitchTemperature()` function is not working in that firmware version.
For an alternative approach the `getTemperature()` polyfill function was added which supports both switches and thermostats.

All functions have been tested on FritzOS 6.20/6.36 / FritzBox 7390. The WLAN functions may be less stable.


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
