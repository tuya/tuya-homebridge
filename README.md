# @0x5e/homebridge-tuya-platform

[![npm](https://badgen.net/npm/v/@0x5e/homebridge-tuya-platform)](https://npmjs.com/package/@0x5e/homebridge-tuya-platform)
[![npm](https://badgen.net/npm/dt/@0x5e/homebridge-tuya-platform)](https://npmjs.com/package/@0x5e/homebridge-tuya-platform)
[![mit-license](https://badgen.net/npm/license/@0x5e/homebridge-tuya-platform)](https://github.com/0x5e/homebridge-tuya-platform/blob/main/LICENSE)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![Build and Lint](https://github.com/0x5e/homebridge-tuya-platform/actions/workflows/build.yml/badge.svg)](https://github.com/0x5e/homebridge-tuya-platform/actions/workflows/build.yml)
[![join-discord](https://badgen.net/badge/icon/discord?icon=discord&label=homebridge/tuya)](https://discord.gg/homebridge-432663330281226270)


Fork version of official Tuya Homebridge plugin. Brings a bunch of bug fix and new device support.


## Features

- Optimized code, improved code readability and maintainability.
- Improved stability.
- Less duplicate code.
- Less API errors.
- Less development costs for new accessory categroies.
- Tuya Scene supported (Tap-to-Run).
- Device overriding config supported. "Non-standard DP" have possibility to be supported now.
- More than 40+ device categories supported, including most of the lights, switches, sensors, cameras ...


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
    - IoT Video Live Stream (for Camera)
    - Industry Project Client Service (for "Custom" project)
    - Smart Home Scene Linkage (for Scene)
- **⚠️Extend the API trial period every 6 months here (first-time subscription only give 1 month): [Tuya IoT Platform > Cloud > Cloud Services > IoT Core](https://iot.tuya.com/cloud/products/detail?abilityId=1442730014117204014&id=p1668587814138nv4h3n&abilityAuth=0&tab=1)**

#### For "Custom" Project

- `platform` - **required** : Must be 'TuyaPlatform'
- `options.projectType` - **required** : Must be '1'
- `options.endpoint` - **required** : Endpoint URL from [API Reference > Endpoints](https://developer.tuya.com/en/docs/iot/api-request?id=Ka4a8uuo1j4t4#title-1-Endpoints) table.
- `options.accessId` - **required** : Access ID from [Tuya IoT Platform > Cloud Develop](https://iot.tuya.com/cloud)
- `options.accessKey` - **required** : Access Secret from [Tuya IoT Platform > Cloud Develop](https://iot.tuya.com/cloud)

#### For "Smart Home" Project

- `platform` - **required** : Must be 'TuyaPlatform'
- `options.projectType` - **required** : Must be '2'
- `options.accessId` - **required** : Access ID from [Tuya IoT Platform > Cloud Develop](https://iot.tuya.com/cloud)
- `options.accessKey` - **required** : Access Secret from [Tuya IoT Platform > Cloud Develop](https://iot.tuya.com/cloud)
- `options.countryCode` - **required** : Country Code
- `options.username` - **required** : Username
- `options.password` - **required** : Password
- `options.appSchema` - **required** : App schema. 'tuyaSmart' for Tuya Smart App, 'smartlife' for Smart Life App.
- `options.homeWhitelist` - **optional**: An array of integer home ID values to whitelist. If present, only includes devices matching this Home ID value. Home ID can be found in the homebridge log.


#### Advanced options
See [ADVANCED_OPTIONS.md](./ADVANCED_OPTIONS.md)


## Limitations
- **⚠️Don't forget to extend the API trial period every 6 months. Maybe you can set up a reminder in calendar.**
- The app account can't be used in multiple Homebridge/HomeAssistant instance at the same time! Please consider using different app accounts instead.
- The plugin requires the internet access to Tuya Cloud, and the lan protocol is not supported. See [#90](https://github.com/0x5e/homebridge-tuya-platform/issues/90)

## FAQ

#### What is "Standard DP" and "Non-standard DP"?

If your device is working properly, you don't need to know this.

"Standard DP" means the device's DP Code is matching the code in documentation at: [Tuya IoT Development Platform Documentation > Cloud Development > Standard Instruction Set](https://developer.tuya.com/en/docs/iot/standarddescription?id=K9i5ql6waswzq).

For example, a Lightbulb must have `switch_led` for power on/off, and optional code
`bright_value`/`bright_value_v2` for brightness, `temp_value`/`temp_value_v2` for color temperature, `work_mode` for change working mode. These code can be found from above documentation. 

If your Lightbulb can adjust brightness in Tuya App, but can't do with the plugin, then mostly it has an "Non-standard DP".


#### Can "Non-standard DP" be supportd by this plugin?

Yes. The device should be in the support list, then you need do these steps before it's working.
1. Change device's control mode on Tuya Platform.
  - Go to "[Tuya Platform Cloud Development](https://iot.tuya.com/cloud/) > Your Project > Devices > All Devices > View Devices by Product".
  - Find your device-related product, click the "pencil" icon (Change Control Instruction Mode).
  - <img width="500" alt="image" src="https://user-images.githubusercontent.com/5144674/202967707-8b934e05-36d6-4b42-bb7b-87e5b24474c4.png">
  - The "Table of Instructions" shows the cloud mapping, you can know which DP Codes of your device is missing, you need to manually map them later.
  - <img width="500" alt="image" src="https://user-images.githubusercontent.com/5144674/202967528-4838f9a1-0547-4102-afbb-180dc9b198b1.png">
  - Select "DP Instruction" and save.
2. Override device schema, see [ADVANCED_OPTIONS.md](./ADVANCED_OPTIONS.md).


#### Local support
See [#90](https://github.com/0x5e/homebridge-tuya-platform/issues/90).

Although the plugin didn't implemented tuya local protocol now, it still remains possibility in the future.


## Troubleshooting

If your device is not supported, please complete the following steps to collecting the data.

#### 1. Get Device Information

After successful launching Homebridge, the device info list will be saved inside Homebridge's persist path.
You can get the file path from homebridge log:
```
[2022/11/3 18:37:43] [TuyaPlatform] Device list saved at /path/to/TuyaDeviceList.{uid}.json
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

If you can't get any mqtt logs when controlling the device, mostly means that your device probably have "Non-standard DP".

With the device info json and mqtt logs, please submit the issue to help us supporting new device category.


## Contributing

Please see https://github.com/homebridge/homebridge-plugin-template for setup development environment.

PRs and issues are welcome.

# 
Thank you for spend time using the project. If it helps you, don't hesitate to give it a star 🌟:-)
