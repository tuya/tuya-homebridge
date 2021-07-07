Tuya Homebridge Plugin
========================

<p align="center">
    <img src="https://images.tuyacn.com/app/hass/hb_tuya.png" width="70%"><br>
</p>

<span align="center">
    
[![npm](https://img.shields.io/npm/v/homebridge-tuya-platform.svg)](https://www.npmjs.com/package/homebridge-tuya-platform)
[![npm](https://img.shields.io/npm/dt/homebridge-tuya-platform.svg)](https://www.npmjs.com/package/homebridge-tuya-platform)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

</span>

Homebridge custom plugin for controlling Powered by Tuya (PBT) devices in HomeKit, it's based on [Tuya Open API](https://developer.tuya.com/en/docs/cloud/?_source=2e646f88eae60b7eb595e94fc3866975). The plugin is officially maintained by the Tuya Developer Team.

## [Tuya Beta Test Program](https://pages.tuya.com/develop/Homebridgebetainvitation?_source=ea61b9486f59eb89a3ee74b43140b9f3#form)
Welcome to join the [Tuya Beta Test Program](https://pages.tuya.com/develop/Homebridgebetainvitation?_source=ea61b9486f59eb89a3ee74b43140b9f3#form) to get your development gifts and make the contribution to the plugin.Your feedback is valuable to the whole community.


✌️✌️✌️ [Supported Tuya Device Types](https://github.com/tuya/tuya-homebridge/wiki/Supported-Tuya-Device-Types) ✌️✌️✌️

 :tada: :tada: :tada: [Vote for Tuya Homebridge Plugin New Device Driver Support!](https://github.com/tuya/tuya-homebridge/discussions/58) :tada::tada::tada:

### Youtube Tutorial:

[![Youtube](https://img.youtube.com/vi/YH6d-2VJMaU/0.jpg)](https://www.youtube.com/watch?v=YH6d-2VJMaU)


## Preparation
- [How To Register Iot Cloud Project](https://developer.tuya.com/en/docs/iot/Platform_Configuration_smarthome?id=Kamcgamwoevrx&_source=6435717a3be1bc67fdd1f6699a1a59ac)

- [How To Use Tuya Homebridge Plugin](https://developer.tuya.com/en/docs/iot/Tuya_Homebridge_Plugin?id=Kamcldj76lhzt&_source=f3feb8f41d71c863087f8bc8032c9a4a)

- [How To Contribute Code](https://github.com/tuya/tuya-homebridge/wiki/How-to-Develop-a-New-Driver)

## Set up the development environment

```
—-VSCode
—-engines
    "node": “>=0.12.0”
    "homebridge": ">=0.2.0"
—-dependencies
    "axios": “^0.21.1",
    "crypto-js": “^4.0.0”, 
    "mqtt": “^4.2.6",
    "uuid": "^8.3.2"
```

## Tuya OpenApi Login Error Code

| Error code | Error message | Troubleshooting |
|:----|:----|:----|
| 1004 | sign invalid | <ul><li> Incorrect `accessId` or `accessKey`. To fix the error, see [Edit config.json](https://developer.tuya.com/en/docs/iot/Tuya_Homebridge_Plugin?id=Kamcldj76lhzt#config) file.</li><li> Due to the new signature verification mode, the server will have the cache of the old mode. Please create a Github Issue to inform us. |
| 1106 | permission deny | <ul><li> Your app account is not linked with your cloud project: Link devices by using the Tuya Smart or Smart Life app with your cloud project on the [Tuya IoT Platform](https://iot.tuya.com/cloud/). For more information, see [Link devices by app account](https://developer.tuya.com/en/docs/iot/Platform_Configuration_smarthome?id=Kamcgamwoevrx#title-3-Link%20devices%20by%20app%20account).</li><li>The **TuyaSmart** or **SmartLife** app account which registered using **Google** or **Apple ID** email need to link your phone number and use the linked phone number as **username** to login. </li><li> Incorrect username or password: Enter the correct account and password of the Tuya Smart or Smart Life app in the **Account** and **Password** fields. Note that the app account must be the one you used to link devices with your cloud project on the [Tuya IoT Platform](https://iot.tuya.com/cloud/).</li><li>Incorrect endpoint: See [Endpoint](https://developer.tuya.com/en/docs/iot/Tuya_Homebridge_Plugin?id=Kamcldj76lhzt#endpoint) and enter the correct endpoint.</li><li>Incorrect countryCode: Enter the [code of the country](https://countrycode.org/) you select on logging in to the Tuya Smart or Smart Life app.</li><li>Incorrect **schema** (case insensitive). Currently only **tuyaSmart** and **smartlife** are supported.</li></ul> |
| 1100 | param is empty | `username` or `appSchema` is empty: See [Edit config.json](https://developer.tuya.com/en/docs/iot/Tuya_Homebridge_Plugin?id=Kamcldj76lhzt#config) file and enter the correct parameter. |
| 2017 | schema does not exist | Incorrect `appSchema` in `config.json`: See [Edit config.json](https://developer.tuya.com/en/docs/iot/Tuya_Homebridge_Plugin?id=Kamcldj76lhzt#config) file and enter the correct parameter. |
| 2406 | skill id invalid | <ul><li>Cloud project created before May 25, 2021: Your cloud project on the [Tuya IoT Platform](https://iot.tuya.com/cloud/) should be created after May 25, 2021. Otherwise, you need to create a new project. For more information, see [Operation on the Tuya IoT Platform](https://developer.tuya.com/en/docs/iot/migrate-from-an-older-version?id=Kamee9wtbd00b#title-3-Operation%20on%20the%20Tuya%20IoT%20Platform). </li><li> Cloud project created after May 25, 2021, but it is not associated with your **TuyaSmart** or **SmartLife** app account. Please associated it in the Tuya IoT platform. For more information, see [Link devices by app account](https://developer.tuya.com/en/docs/iot/Platform_Configuration_smarthome?id=Kamcgamwoevrx#title-3-Link%20devices%20by%20app%20account). </li></ul></li></ul>|
| 28841105 | No permissions. This project is not authorized to call this API | You have not authorized your cloud project to use the required APIs. Subscribe to the following required [API products](https://developer.tuya.com/en/docs/iot/applying-for-api-group-permissions?id=Ka6vf012u6q76#title-2-Subscribe%20to%20cloud%20products) and [authorize your project to use them](https://developer.tuya.com/en/docs/iot/applying-for-api-group-permissions?id=Ka6vf012u6q76#title-3-Authorize%20projects%20to%20call%20the%20cloud%20product).   <ul><li>Authorization</li><li>Smart Home Devices Management</li><li>Smart Home Family Management</li><li>Smart Home Scene Linkage</li><li>Smart Home Data Service</li><li>Device Status Notification</li></ul> |

## Users

If you are a smart home geek and have a bundle of devices from different platforms, this step-by-step tutorial will help you make devices HomeKit-enabled and then develop Tuya Homebridge plugins.

## Feedback

You can use the **GitHub Issue** or [**tickets**](https://service.console.tuya.com/8/2/list?_source=c5965e0f53c87ba9d0eb99af0f4b124f) to provide feedback on any problems you encounter.

## LICENSE

For more information, see the [LICENSE](LICENSE) file.
