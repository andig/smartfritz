# smartfritz

Node module to communicate with a AVM FritzBox and FRITZ!DECT 200 (smart home hardware) providing the following functions:

- Get the session ID (getSessionID)
- Get the switch (FRITZ!DECT 200) State (getSwitchState)
- Set the switch (FRITZ!DECT 200) ON (setSwitchOn)
- Set the switch (FRITZ!DECT 200) OFF (setSwitchOff)
- Get the switch (FRITZ!DECT 200) Power (getSwitchPower)
- Get the switch (FRITZ!DECT 200) Energy (getSwitchEnergy)
- Get the switch (FRITZ!DECT 200) List (getSwitchList)
- Get the DeviceListInfos (FRITZ!DECT 200) as XML (getDeviceListInfos) >FritzOS 6.10
- Set the guest wlan (setGuestWLan)
- Get the guest wlan settings (getGuestWLan)

All functions have been tested on FritzOS 6.20 / FritzBox 7390. The WLAN functions may be less stable.

For AVM FRITZ!DECT 200  control you need to know your Actuator identification number (AIN)

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
