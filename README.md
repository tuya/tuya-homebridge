# @0x5e/homebridge-tuya-platform

[![npm](https://badgen.net/npm/v/@0x5e/homebridge-tuya-platform)](https://npmjs.com/package/@0x5e/homebridge-tuya-platform)
[![npm](https://badgen.net/npm/dt/@0x5e/homebridge-tuya-platform)](https://npmjs.com/package/@0x5e/homebridge-tuya-platform)
[![mit-license](https://badgen.net/npm/license/@0x5e/homebridge-tuya-platform)](https://github.com/0x5e/homebridge-tuya-platform/blob/main/LICENSE)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![Build and Lint](https://github.com/0x5e/homebridge-tuya-platform/actions/workflows/build.yml/badge.svg)](https://github.com/0x5e/homebridge-tuya-platform/actions/workflows/build.yml)
[![join-discord](https://badgen.net/badge/icon/discord?icon=discord&label=homebridge/tuya)](https://discord.gg/homebridge-432663330281226270)


Fork version of the official Tuya Homebridge plugin, with a focus on fixing bugs and adding new device support.


## Features

- Optimized and improved code for better readability and maintainability.
- Enhanced stability.
- Reduced duplicate code.
- Fewer API errors.
- Lower development costs for new accessory categories.
- Supports Tuya Scenes (Tap-to-Run).
- Includes the ability to override device configurations, which enables support for "non-standard" DPs.
- Supports over 60+ device categories, including most light, switch, sensor, camera, lock, IR remote control, etc.


## Supported Tuya Devices
See [SUPPORTED_DEVICES.md](./SUPPORTED_DEVICES.md)


## Changelogs
See [CHANGELOG.md](./CHANGELOG.md)


## Installation
Before using this plugin, please make sure to uninstall `homebridge-tuya-platform` first as these two plugins cannot run simultaneously. However, the configuration files are compatible, so there's no need to delete them.

#### For Homebridge Web UI Users
Go to plugin page, search for `@0x5e/homebridge-tuya-platform` and install it.


#### For Homebridge Command Line Users

Run the following command in the terminal:
```
npm install @0x5e/homebridge-tuya-platform
```


## Configuration

There are two types of projects: `Custom` and `Smart Home`.
The difference between them is:
- The `Custom` project pulls devices from the project's assets.
- The `Smart Home` project pulls devices from the user's home in the Tuya app.

If you are a personal user and are unsure which one to choose, please use the `Smart Home` project.

Before you can configure, you must go to the [Tuya IoT Platform](https://iot.tuya.com):
- Create a cloud development project, and select the data center where your app account is located. See [Mappings Between OEM App Accounts and Data Centers](https://developer.tuya.com/en/docs/iot/oem-app-data-center-distributed?id=Kafi0ku9l07qb)
- Go to the `Project Page` > `Devices Panel` > `Link Tuya App Account`, and link your app account.
- Go to the `Project Page` > `Service API` > `Go to Authorize`, and subscribe to the following APIs (it is free for trial):
    - Authorization Token Management
    - Device Status Notification
    - IoT Core
    - IoT Video Live Stream (for cameras)
    - Industry Project Client Service (for the `Custom` project)
    - IR Control Hub Open Service (for IR devices)
    - Smart Home Scene Linkage (for scenes)
    - Smart Lock Open Service (for Lock devices)
- **⚠️Remember to extend the API trial period every 6 months here [Tuya IoT Platform > Cloud > Cloud Services > IoT Core](https://iot.tuya.com/cloud/products/detail?abilityId=1442730014117204014&id=p1668587814138nv4h3n&abilityAuth=0&tab=1) (the first-time subscription only gives you 1 month).**

#### For "Custom" Project

- `platform` - **required** : Must be 'TuyaPlatform'
- `options.projectType` - **required** : Must be '1'
- `options.endpoint` - **required** : The endpoint URL taken from the [API Reference > Endpoints](https://developer.tuya.com/en/docs/iot/api-request?id=Ka4a8uuo1j4t4#title-1-Endpoints) table.
- `options.accessId` - **required** : The Access ID obtained from [Tuya IoT Platform > Cloud Develop](https://iot.tuya.com/cloud)
- `options.accessKey` - **required** : The Access Secret obtained from [Tuya IoT Platform > Cloud Develop](https://iot.tuya.com/cloud)

#### For "Smart Home" Project

- `platform` - **required** : Must be 'TuyaPlatform'
- `options.projectType` - **required** : Must be '2'
- `options.accessId` - **required** : The Access ID obtained from [Tuya IoT Platform > Cloud Develop](https://iot.tuya.com/cloud)
- `options.accessKey` - **required** : The Access Secret obtained from [Tuya IoT Platform > Cloud Develop](https://iot.tuya.com/cloud)
- `options.countryCode` - **required** : The country code of your app account's region.
- `options.username` - **required** : The app account's username.
- `options.password` - **required** : The app account's password. MD5 salted password is also available for increased security.
- `options.appSchema` - **required** : The app schema: 'tuyaSmart' for the Tuya Smart App, or 'smartlife' for the Smart Life App.
- `options.endpoint` - **optional** : The endpoint URL can be inferred from the [API Reference > Endpoints](https://developer.tuya.com/en/docs/iot/api-request?id=Ka4a8uuo1j4t4#title-1-Endpoints) table based on the country code provided. Only manually set this value if you encounter login issues and need to specify the endpoint for your account location.
- `options.homeWhitelist` - **optional**: An array of integer values for the home IDs you want to whitelist. If provided, only devices with matching Home IDs will be included. You can find the Home ID in the homebridge log.


#### Advanced options
See [ADVANCED_OPTIONS.md](./ADVANCED_OPTIONS.md)


## Limitations
- **⚠️Don't forget to extend the API trial period every 6 months. Maybe you can set up a reminder in calendar.**
- Using the same app account for multiple Homebridge/HomeAssistant instances is not supported. Please use separate app accounts for each instance.
- The plugin requires an internet connection to the Tuya Cloud and does not support the LAN protocol. See [#90](https://github.com/0x5e/homebridge-tuya-platform/issues/90) for more information.

## FAQ

#### About Login issue

For most users, you can easily find your app account's data center through the [documentation](https://developer.tuya.com/en/docs/iot/oem-app-data-center-distributed?id=Kafi0ku9l07qb) and login without any issues. However, for some users, they may encounter error codes such as 1106 or 2406. If you encounter such errors, it's possible that there are differences between your data center and the documentation.

To determine the data center, follow these steps:

1. Open the app and navigate to "Me > Settings > Network Diagnosis".
2. Start the diagnosis and select "Upload Log > Copy the Log to Clipboard".
3. Paste the log anywhere and find the line beginning with "Region code:".
4. Look for the following codes: "AY" for China, "AZ" for the West US, "EU" for Central Europe, and "IN" for India.

Then manually specify endpoint in the plugin config.


#### What is "Standard DP" and "Non-standard DP"?

<!-- If your device is working properly, you don't need to know this. -->

"Standard DP" refers to device properties or functionalities that are specified in the Tuya IoT Development Platform documentation at [Tuya IoT Development Platform Documentation > Cloud Development > Standard Instruction Set](https://developer.tuya.com/en/docs/iot/standarddescription?id=K9i5ql6waswzq).

For example, a light bulb should have a standard DP code of `switch_led` for power on/off, and optional codes `bright_value`/`bright_value_v2` for brightness, `temp_value`/`temp_value_v2` for color temperature, and `work_mode` for changing the working mode. These codes can be found in the above documentation.

If your light bulb can be adjusted in the Tuya app but not with the plugin, it most likely has "Non-standard DP."


#### Can "Non-standard DP" be supportd by this plugin?

Yes. The device must be listed in the support list and the following steps must be completed before it will work:
1. Change the device's control mode on the Tuya Platform:
  - Go to "[Tuya Platform Cloud Development](https://iot.tuya.com/cloud/) > Your Project > Devices > All Devices > View Devices by Product".
  - Find the product related to your device, click the "pencil" icon (Change Control Instruction Mode).
  - <img width="500" alt="image" src="https://user-images.githubusercontent.com/5144674/202967707-8b934e05-36d6-4b42-bb7b-87e5b24474c4.png">
  - In the "Table of Instructions", you can see the cloud mapping and determine which DP codes are missing and need to be manually mapped later.
  - <img width="500" alt="image" src="https://user-images.githubusercontent.com/5144674/202967528-4838f9a1-0547-4102-afbb-180dc9b198b1.png">
  - Select "DP Instruction" and save.
2. Override the device schema, see [ADVANCED_OPTIONS.md](./ADVANCED_OPTIONS.md).


#### Local support
See [#90](https://github.com/0x5e/homebridge-tuya-platform/issues/90).

Although the plugin didn't implemented tuya local protocol now, it still remains possibility in the future.


## Troubleshooting

If your device is not supported, please follow these steps to collect information.

#### 1. Get Device Information

After Homebridge has been successfully launched, the device information list will be saved in Homebridge's persist path. You can find the file path in the Homebridge log:
```
[2022/11/3 18:37:43] [TuyaPlatform] Device list saved at /path/to/TuyaDeviceList.{uid}.json
```

**⚠️Please make sure to remove sensitive information such as `ip`, `lon`, `lat`, `local_key`, and `uid` before submitting the file.**


#### 2. Enable Homebridge Debug Mode

For Homebridge Web UI users:
- Go to the `Homebridge Setting` page
- Turn on the `Homebridge Debug Mode -D` switch
- Restart Homebridge.

For Homebridge Command Line Users:
- Start Homebridge with the `-D` flag: `homebridge -D`

#### 3. Collect Logs

With debug mode enabled, you can now receive MQTT logs. Operate your device, either physically or through the Tuya App, to receive MQTT logs like this:

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

If you are unable to receive any MQTT logs while controlling the device, it likely means that your device has "Non-standard DP".

By submitting the device information JSON and MQTT logs, you can help us support new device categories.


## Contributing

Please see https://github.com/homebridge/homebridge-plugin-template#setup-development-environment for setup development environment.

PRs and issues are welcome.

# 
Thank you for spend time using the project. If it helps you, don't hesitate to give it a star 🌟:-)
