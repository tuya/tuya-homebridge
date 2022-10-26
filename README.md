# @0x5e/homebridge-tuya-platform

[![npm](https://badgen.net/npm/v/@0x5e/homebridge-tuya-platform)](https://npmjs.com/package/@0x5e/homebridge-tuya-platform)
[![npm](https://badgen.net/npm/dt/@0x5e/homebridge-tuya-platform)](https://npmjs.com/package/@0x5e/homebridge-tuya-platform)
[![mit-license](https://badgen.net/npm/license/@0x5e/homebridge-tuya-platform)](https://github.com/0x5e/homebridge-tuya-platform/blob/main/LICENSE)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

Tuya plugin for Hombridge, maintained by @0x5e, former employee of Tuya.

Published as [@0x5e/homebridge-tuya-platform](https://npmjs.com/package/@0x5e/homebridge-tuya-platform), currently in beta version.

If beta version works fine for a while, it will be merged into the upstream repo in the future.

## Features

- Optimized code, improved code readability and maintainability.
- Improved stability.
- Less duplicate code.
- Less API errors.
- Less development costs for new accessory categroies.
- More supported devices.
    - Air Quality Sensor
    - Carbon Monoxide Sensor
    - Carbon Dioxide Sensor
    - Motion Sensor
    - Light Sensor
    - Water Detector
    - Temperature and Humidity Sensor
    - Human Presence Sensor
    - Window
- Reimplemented accessory code. Some bug fixed.
    - Switch
    - Outlet
    - Lightbulb
    - Garage Door Opener
    - Window Covering
    - Smoke Sensor
    - Contact Sensor
    - Leak Sensor
- For `Custom` project, `username` and `password` options are no longer need. The plugin will create a default user and authorize to all assets automatically.


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
- Create a cloud develop project.
- Go to `Project Page` > `Devices Panel` > `Link Tuya App Account`, link your app account.

## For "Custom" Project

- `platform` - **required** : Must be 'TuyaPlatform'
- `options.projectType` - **required** : Must be '1'
- `options.endpoint` - **required** : Endpoint URL from [API Reference -> Endpoints](https://developer.tuya.com/en/docs/iot/api-request?id=Ka4a8uuo1j4t4#title-1-Endpoints) table.
- `options.accessId` - **required** : Access ID from [Tuya IoT Platform -> Cloud Develop](https://iot.tuya.com/cloud)
- `options.accessKey` - **required** : Access Secret from [Tuya IoT Platform -> Cloud Develop](https://iot.tuya.com/cloud)

## For "Smart Home" Project

- `platform` - **required** : Must be 'TuyaPlatform'
- `options.projectType` - **required** : Must be '2'
- `options.accessId` - **required** : Access ID from [Tuya IoT Platform -> Cloud Develop](https://iot.tuya.com/cloud)
- `options.accessKey` - **required** : Access Secret from [Tuya IoT Platform -> Cloud Develop](https://iot.tuya.com/cloud)
- `options.countryCode` - **required** : Country Code
- `options.username` - **required** : Username
- `options.password` - **required** : Password
- `options.appSchema` - **required** : App schema. 'tuyaSmart' for Tuya Smart App, 'smartlife' for Smart Life App.


## Troubleshooting

#### Enable Debug Mode

For Homebridge Web UI users:
- Go to the `Homebridge Setting` page
- Turn on the `Homebridge Debug Mode -D` switch
- Restart HomeBridge.

For Homebridge Command Line Users:
- Start Homebridge with `-D` flag: `homebridge -D`


## Contributing

Please see https://github.com/homebridge/homebridge-plugin-template

PRs and issues are welcome.

# 
Thank you for spend time using the project. If it helps you, don't hesitate to give it a star 🌟:-)
