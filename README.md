# @0x5e/homebridge-tuya-platform

[![npm](https://badgen.net/npm/v/@0x5e/homebridge-tuya-platform)](https://npmjs.com/package/@0x5e/homebridge-tuya-platform)
[![npm](https://badgen.net/npm/dt/@0x5e/homebridge-tuya-platform)](https://npmjs.com/package/@0x5e/homebridge-tuya-platform)
[![mit-license](https://badgen.net/npm/license/@0x5e/homebridge-tuya-platform)](https://github.com/0x5e/homebridge-tuya-platform/blob/main/LICENSE)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![Build and Lint](https://github.com/0x5e/homebridge-tuya-platform/actions/workflows/build.yml/badge.svg)](https://github.com/0x5e/homebridge-tuya-platform/actions/workflows/build.yml)

Fork version of official Tuya Homebridge plugin. Brings a lot of bug fix and new device support.


## Features

- Optimized code, improved code readability and maintainability.
- Improved stability.
- Less duplicate code.
- Less API errors.
- Less development costs for new accessory categroies.
- Scene supported.
- More supported devices.
    - [Light] Spotlight (`sxd`)
    - [Light] Motion Sensor Light (`gyd`)
    - [Light] Solar Light (`tyndj`)
    - [Dimmer] Dual Dimmer (`tgq`)
    - [Dimmer] Dual Dimmer Switch (`tgkg`)
    - [Switch] Scene Light Socket (`qjdcz`)
    - [StatelessProgrammableSwitch] Wireless Switch (`wxkg`)
    - [Fanv2] Ceiling Fan Light (`fsd`)
    - [Window] Door and Window Controller (`mc`)
    - [WindowCovering] Curtain Switch (`clkg`)
    - [Thermostat] Thermostat (`wk`)
    - [Thermostat] Thermostat Valve (`wkf`)
    - [Valve] Irrigator (`ggq`)
    - [AirQualitySensor] PM2.5 Detector (`pm25`)
    - [TemperatureHumiditySensor] Temperature and Humidity Sensor (`wsdcg`)
    - [MotionSensor] Motion Sensor (`pir`)
    - [HumanPresenceSensor] Human Presence Sensor (`hps`)
    - [LightSensor] Light Sensor (`ldcg`)
    - [CarbonMonoxideSensor] CO Detector (`cobj`)
    - [CarbonDioxideSensor] CO2 Detector (`co2bj`)
    - [LeakSensor] Water Detector (`sj`)
    - [HumidifierDehumidifier] Humidifier (`jsq`)


## Supported Tuya Devices
See [SUPPORTED_DEVICES.md](./SUPPORTED_DEVICES.md)


## Changelogs
See [CHANGELOG.md](./CHANGELOG.md)


## Installation
Before use, please uninstall `homebridge-tuya-platform` first. They can't run together. (But the config is compatible, no need to delete.)

#### For Homebridge Web UI Users
Go to plugin page, search `@0x5e/homebridge-tuya-platform` and install.


#### For Homebridge Command Line Users

```
npm install @0x5e/homebridge-tuya-platform
```


## Configuration

There's two type of project: `Custom` and `Smart Home`.
The differenct between them is:
- `Custom` Project pull devices from project's asset.
- `Smart Home` Project pull devices from Tuya App user's home.

If you are personal user and don't know which to choose, please use `Smart Home`.

Before configuration, please goto [Tuya IoT Platform](https://iot.tuya.com)
- Create a cloud develop project, select the data center where your app account located. See [Mappings Between OEM App Accounts and Data Centers](https://developer.tuya.com/en/docs/iot/oem-app-data-center-distributed?id=Kafi0ku9l07qb) (If you don't know where it is, just select all.)
- Go to `Project Page` > `Devices Panel` > `Link Tuya App Account`, link your app account.
- Go to `Project Page` > `Service API` > `Go to Authorize`, subscribe the following APIs (it's free for trial):
    - Authorization Token Management
    - Device Status Notification
    - IoT Core
    - Industry Project Client Service (for "Custom" project)
- **⚠️Extend the API trial period every 6 months here (first-time subscription only give 1 month): [Tuya IoT Platform -> Cloud -> Cloud Services -> IoT Core](https://iot.tuya.com/cloud/products/detail?abilityId=1442730014117204014&id=p1668587814138nv4h3n&abilityAuth=0&tab=1)**

#### For "Custom" Project

- `platform` - **required** : Must be 'TuyaPlatform'
- `options.projectType` - **required** : Must be '1'
- `options.endpoint` - **required** : Endpoint URL from [API Reference -> Endpoints](https://developer.tuya.com/en/docs/iot/api-request?id=Ka4a8uuo1j4t4#title-1-Endpoints) table.
- `options.accessId` - **required** : Access ID from [Tuya IoT Platform -> Cloud Develop](https://iot.tuya.com/cloud)
- `options.accessKey` - **required** : Access Secret from [Tuya IoT Platform -> Cloud Develop](https://iot.tuya.com/cloud)

#### For "Smart Home" Project

- `platform` - **required** : Must be 'TuyaPlatform'
- `options.projectType` - **required** : Must be '2'
- `options.accessId` - **required** : Access ID from [Tuya IoT Platform -> Cloud Develop](https://iot.tuya.com/cloud)
- `options.accessKey` - **required** : Access Secret from [Tuya IoT Platform -> Cloud Develop](https://iot.tuya.com/cloud)
- `options.countryCode` - **required** : Country Code
- `options.username` - **required** : Username
- `options.password` - **required** : Password
- `options.appSchema` - **required** : App schema. 'tuyaSmart' for Tuya Smart App, 'smartlife' for Smart Life App.
- `options.homeWhitelist` - **optional**: An array of integer home ID values to whitelist. If present, only includes devices matching this Home ID value.
- `options.sceneWhitelist` - **optional**: An array of integer scene ID values to whitelist. If present, only includes scene matching this Scene ID value.


## Limitations
- **⚠️Don't forget to extend the API trial period every 6 months. Maybe you can set up a reminder in calendar.**
- The app account can't be used in multiple Homebridge/HomeAssistant instance at the same time! Please consider using different app accounts instead.
- The plugin requires the internet access to Tuya Cloud, and the lan protocol is not supported. See [#90](https://github.com/0x5e/homebridge-tuya-platform/issues/90)


## Troubleshooting

If your device is in the support list, but not working properly, meanwhile, the same feature works well in Tuya App, please complete the following steps before submit the issue.

#### 1. Get Device Information

After successful launching Homebridge, the device info list will be saved inside Homebridge's persist path.
You can get the file path from homebridge log:
```
[2022/11/3 18:37:43] [TuyaPlatform] Device list saved at ~/.homebridge/persist/TuyaDeviceList.{uid}.json
```

**⚠️Please remove the sensitive data such as `ip`, `lon`, `lat`, `local_key`, `uid` before submit the file.**


#### 2. Enable Homebridge Debug Mode

For Homebridge Web UI users:
- Go to the `Homebridge Setting` page
- Turn on the `Homebridge Debug Mode -D` switch
- Restart Homebridge.

For Homebridge Command Line Users:
- Start Homebridge with `-D` flag: `homebridge -D`

#### 3. Collecting Logs

With debug mode on, you can now receive mqtt logs. Operate your device physically, or via Tuya App, then you will get mqtt logs like this:

```
[2022/12/8 12:51:59] [TuyaPlatform] [TuyaOpenMQ] onMessage:
topic = cloud/token/in/xxx
protocol = 4
message = {
  "dataId": "xxx",
  "devId": "xxx",
  "productKey": "xxx",
  "status": [
    {
      "1": "double_click",
      "code": "switch1_value",
      "t": "1670475119766",
      "value": "double_click"
    }
  ]
}
```

If you can't get any mqtt logs when controlling the device, mostly means that your device is a "non-standard device". You need to change device control mode into "DP Instruction" mode. See [#111](https://github.com/0x5e/homebridge-tuya-platform/issues/111).

If you can get mqtt logs, please submit the issue with device info json and logs.


## Contributing

Please see https://github.com/homebridge/homebridge-plugin-template

PRs and issues are welcome.

# 
Thank you for spend time using the project. If it helps you, don't hesitate to give it a star 🌟:-)
