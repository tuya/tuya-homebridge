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

<https://www.npmjs.com/package/homebridge-tuya-platform?_source=ce0b8527b06cd3ca2822cc83fe7a0aa4>

 :tada: :tada: :tada: [Vote for Tuya Homebridge Plugin New Device Driver Support!](https://github.com/tuya/tuya-homebridge/discussions/58) :tada::tada::tada:

## Supported Tuya Device Types

The following Tuya Device types are currently supported by this plugin:

- [Light](https://github.com/tuya/tuya-homebridge/blob/master/lib/light_accessory.js): Supports Tuya Wi-Fi light devices.
- [Outlet](https://github.com/tuya/tuya-homebridge/blob/master/lib/outlet_accessory.js): Supports Tuya Wi-Fi Outlet devices.
- [Smoke Sensor](https://github.com/tuya/tuya-homebridge/blob/master/lib/smokesensor_accessory.js): Supports Tuya smoke sensor devices.
- [Switch](https://github.com/tuya/tuya-homebridge/blob/master/lib/switch_accessory.js): Supports Tuya switch devices.
- [Heater](https://github.com/tuya/tuya-homebridge/blob/master/lib/heater_accessory.js): Support Tuya heater devices.
- [Garage Door](https://github.com/tuya/tuya-homebridge/blob/master/lib/garagedoor_accessory.js): Support Tuya smart garage door devices.
- [Fan](https://github.com/tuya/tuya-homebridge/blob/master/lib/fanv2_accessory.js): Support Tuya fan devices.
- [Air Purifier](https://github.com/tuya/tuya-homebridge/blob/master/lib/air_purifier_accessory.js): Support Tuya air purifier devices.

## Tuya Homebridge Integration User Guide

For more information, please check [How to Use Tuya Homebridge Plugin](https://developer.tuya.com/en/docs/iot/Tuya_Homebridge_Plugin?id=Kamcldj76lhzt&_source=f3feb8f41d71c863087f8bc8032c9a4a). 

Youtube tutorial:

[![Youtube](https://img.youtube.com/vi/YH6d-2VJMaU/0.jpg)](https://www.youtube.com/watch?v=YH6d-2VJMaU)


## Preparation

### Registration

Create a cloud project of **Smart Home PaaS** on the [Tuya IoT Platform](https://iot.tuya.com/cloud/?_source=681de17de8fab5904815ae7734942be6) and linked devices with this project. For more information, see [Tuya IoT Platform Configuration Guide Using Smart Home PaaS](https://developer.tuya.com/en/docs/iot/Platform_Configuration_smarthome?id=Kamcgamwoevrx&_source=6435717a3be1bc67fdd1f6699a1a59ac).

### Hardware Preparation

| Hardware | Description |
|:----|:----|
| A Mac/PC, Raspberry Pi, or server | Install plugins and start Homebridge service. This demonstration runs on macOS. |
| Smart devices | Demonstrate device integration and control.  |
| An iOS device with the Home app installed | Control HomeKit-enabled devices.  |

### Software Preparation

| Software | Description |
|:----|:----|
| Command line interface | Use the one you like. We use the built-in **Terminal** on macOS. |
| Mobile Apps | **Tuya Smart App** or **Tuya Smart Life App** |

## Quick Start

**1.** Open the Terminal.

 <img src="https://airtake-public-data-1254153901.cos.ap-shanghai.myqcloud.com/content-platform/hestia/16191602132dfd87f5eab.png" alt="Terminal" style="zoom: 60%;" />

**2.** Check the [Homebridge](https://github.com/homebridge/homebridge/blob/master/README.md) and install Homebridge in your system.

**3.** Install Tuya Homebridge plugin.

   > **Note**: If you encounter any problems with the installation, you may need to preface this command with `sudo` to make it run as an administrator.

   1. Install plugins.
        ```
        npm install homebridge-tuya-platform
        ```
   2. Wait for the plugin to install and check whether the installation is successful. For more information, see the video below.

   [<img src="https://asciinema.org/a/eYhi5T5Ht92TDplWU0j35k2Xg.svg" width="40%" />](https://asciinema.org/a/eYhi5T5Ht92TDplWU0j35k2Xg?autoplay=1)

## Configuration

You need to configure the `config.json` file in the Homebridge plugin.

1. Go to the directory `homebridge-tuya-platform`.


    ```
    cd ./node_modules/homebridge-tuya-platform
    ```

2. Go to the directory `config`.


    ```
    cd ./config 
    ```
    
3. Edit the `config.json` file.


    ```
    vim config.json
    ```
    
4. Specify values for **options**.

- **username** and **password**: The user name and password of your Tuya Smart App or Tuya Smart Life App account.

- **accessId** and **accessKey**: The **AccessID** and **Access Secret** of your cloud project respectively. Go to the [Tuya IoT Platform](https://iot.tuya.com/cloud/?_source=681de17de8fab5904815ae7734942be6) and select your cloud project. Navigate to the **Project Overview** tab and find the **Authorization key**.

<img src="https://airtake-public-data-1254153901.cos.ap-shanghai.myqcloud.com/content-platform/hestia/16220229068dc72e7ebd9.png" alt="Edit registration information" style="zoom:70%;" />

- **lang**: Keep the default value **en**.

- **projectType**: "Custom Development" is 1, "Smart Home PaaS" is 2. Here we choose **2**.

- **appSchema**: Use "tuyaSmart" for Tuya Smart App. Use "smartlife" for Tuya Smart Life App.

- **endPoint**: Set it to the address of your location.

	1. America:
	```
    https://openapi.tuyaus.com
   ```
   2. China:
	```
    https://openapi.tuyacn.com
   ```
   3. Europe:
	```
    https://openapi.tuyaeu.com
   ```
   4. India:
	```
    https://openapi.tuyain.com
   ```
   5. EasternAmerica:
	```
    https://openapi-ueaz.tuyaus.com
   ```
   6. WesternEurope:
	```
    https://openapi-weaz.tuyaeu.com
   ```
   
<img src="https://images.tuyacn.com/app/Hanh/newconfig.png"  width="90%;" />

**5.** Save and close the file.

## Start Tuya Homebridge Plugin

1. Go back to the directory `homebridge-tuya-platform`.
    ```
    cd ..
    ```
2. Start the plugin.
    ```
    homebridge -D -U ./config/ -P ./ 
    ```
   
    [<img src="https://asciinema.org/a/KMdki4JjhW0sEmAqS6t3YBGtI.svg" width="60%" />](https://asciinema.org/a/KMdki4JjhW0sEmAqS6t3YBGtI?autoplay=1)

## Bridge to HomeKit

Open the Home app on your Apple device. Pair with Homebridge by scanning the QR code printed in the step of starting the plugin, or entering the 8-digit PIN code. You can find the PIN code in the `config.json` file.

## Contribution guide

Fork Tuya's Homebridge repo in GitHub and follow the step-by-step tutorial to start the plugin service.

### Set up the development environment

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

### Support more accessory types

#### How to implement plugins

<img src="https://airtake-public-data-1254153901.cos.ap-shanghai.myqcloud.com/content-platform/hestia/16191600887aaa687d0e4.png" alt="Plugin development" style="zoom:130%;" />

#### Pay attention to several JSON files

* The entry file `index.js`. Add your desired accessory type to the `addAccessory()` function and create the `xx_accessy.js` file.

<img src="https://images.tuyacn.com/app/Hanh/index.js.png" alt="JSON file" style="zoom:130%;" />

* The `xx_accessory.js` file. In this file, traverse your newly created function in `refreshAccessoryServiceIfNeed()` and get the `Characteristic` corresponding to a service.

<img src="https://images.tuyacn.com/app/Hanh/xx_accessory.js.png" alt="JSON file" style="zoom:130%;" />

* The `tuyaopenapi.js` file contains device related APIs.
* The `tuyamqttapi.js` file supports the MQTT service.

## Common issues

For more information about Homebridge installation, see the **Common Issues** in the [Homebridge](https://github.com/homebridge/homebridge/blob/master/README.md#common-issues) repo.

## Tuya Open API

- `login(username, password)`: Login to the Tuya IoT Platform.
- `getDeviceList()`: Gets all the devices under an account's asset. (Devices correspond to accessories)
- `get_assets()`: Gets the available assets.
- `getDeviceIDList(assetID)`: Queries the list of device IDs under an asset.
- `getDeviceFunctions(deviceID)`: Gets the instruction set.
- `getDeviceInfo(deviceID)`: Gets the information of single device.
- `getDeviceListInfo(devIds = [])`: Gets the information of multiple devices.
- `getDeviceStatus(deviceID)`: Gets the status of single device.
- `getDeviceListStatus(devIds = [])`: Gets the status of multiple devices.
- `sendCommand(deviceID, params)`: Sends commands to a device.

For more info, please check the [Tuya Open API docs](https://developer.tuya.com/en/docs/cloud/?_source=2e646f88eae60b7eb595e94fc3866975).

## MQTT

- `start()`: Starts MQTT.
- `stop()`: Stops MQTT.
- `addMessageListener(listener)`: Adds callbacks.
- `removeMessageListener(listener)`: Removes callbacks.

## What is HomeKit?

HomeKit is Apple's smart home platform introduced in 2014. It allows users of Apple devices to securely and easily control any devices with a 'Works with Apple HomeKit' badge, such as lights, door locks, thermostats, outlets, and many more.

## What is Homebridge?

Homebridge is a lightweight NodeJS server you can run on your home network that emulates the iOS HomeKit API. It supports plugins that provide a basic bridge from HomeKit to various third-party APIs provided by manufacturers of smart home devices. We recommend you check the [Homebridge](https://github.com/homebridge/homebridge/blob/master/README.md) before getting started with Homebridge plugins.

## Users

If you are a smart home geek and have a bundle of devices from different platforms, this step-by-step tutorial will help you make devices HomeKit-enabled and then develop Tuya Homebridge plugins.

## Feedback

You can use the **GitHub Issue** or [**tickets**](https://service.console.tuya.com/8/2/list?_source=c5965e0f53c87ba9d0eb99af0f4b124f) to provide feedback on any problems you encounter.

## LICENSE

For more information, see the [LICENSE](LICENSE) file.
