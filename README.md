Homebridge-Tuya-Platform
========================

[中文版](README_zh.md) | [English](README.md)

## What is HomeKit?

HomeKit is Apple's smart home platform introduced in 2014. It allows users of Apple devices to securely and easily control any devices with a 'Works with Apple HomeKit' badge, such as lights, door locks, thermostats, outlets, and many more.

## What is Homebridge?

Homebridge is a lightweight NodeJS server you can run on your home network that emulates the iOS HomeKit API. It supports plugins that provide a basic bridge from HomeKit to various third-party APIs provided by manufacturers of smart home devices. We recommend you check the [official Homebridge docs](https://github.com/homebridge/homebridge/blob/master/README.md) before getting started with Homebridge plugins.

## Users

If you are a smart home geek and have a bundle of devices from different platforms, this step-by-step tutorial will help you make devices HomeKit-enabled and then develop Tuya Homebridge plugins.

## Preparation

### Registration

Please check [IoT Cloud Platform User Guide](Tuya_IoT_Cloud_Platform_User_Guide.md) to register an account on the [Tuya IoT Platform](https://iot.tuya.com?_source=github), and get the required information. Basically, you need to create a Cloud project and complete the configuration of asset, user, and application. Then, you will get the username, password, Access ID, and Access Secret.

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
| Pairing tool | [IoT App Pairing tool](https://images.tuyacn.com/smart/docs/activate-tool-app-release.apk) or WeChat Mini Program (mainland China only). |

## Quick Start

1. Open the Terminal.

    <img src="https://airtake-public-data-1254153901.cos.ap-shanghai.myqcloud.com/content-platform/hestia/16191602132dfd87f5eab.png" alt="Terminal" style="zoom: 60%;" />

1. See the [official Homebridge docs](https://github.com/homebridge/homebridge/blob/master/README.md) and install Homebridge on your system.
2. Install Tuya Homebridge plugin.

   > **Note**: If you encounter any problems with the installation, you may need to preface this command with `sudo` to make it run as an administrator.

   1. Install plugins.
        ```
        npm install homebridge-tuya-platform
        ```
   2. Wait for the plugin to install and check whether the installation is successful. For more information, see the video below.

      [![asciicast](https://asciinema.org/a/t6GY37mDPbfeG6AXVxuwROBlC.svg)](https://asciinema.org/a/t6GY37mDPbfeG6AXVxuwROBlC?autoplay=1)

## Configuration

Before use, you need to configure the `config.json` file in the Homebridge plugin.
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
4. In `options`, enter the `username`, `password`, `accessId`, and `accessKey` that you get from the [Tuya IoT Platform](https://iot.tuya.com/). The `lang` defaults to `en`. The `endPoint` is the domain name of the currently used Tuya Open API.
      <img src="https://images.tuyacn.com/app/Hanh/config3.json.png" alt="Edit registration information" style="zoom:50%;" />


5. Save and exit.

## Start Tuya Homebridge plugin

1. Go back to the directory `homebridge-tuya-platform`.
    ```
    cd ..
    ```
2. Start the plugin.
    ```
    homebridge -D -U ./config/ -P ./ 
    ```
   [![asciicast](https://asciinema.org/a/2gaFGeKXZtEF1pmOhqTG41M30.svg)](https://asciinema.org/a/2gaFGeKXZtEF1pmOhqTG41M30?autoplay=1)

## Bridge to HomeKit

Open the Home app on your Apple device. Pair with Homebridge by scanning the QR code printed in the step of starting the plugin, or entering the 8-digit PIN code. You can find the PIN code in the `config.json` file.

## Contribution guide

Fork Tuya's Homebridge repo in GitHub and follow the step-by-step tutorial to start the plugin service.

### Set up development environment

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


## MQTT

- `start()`: Starts MQTT.
- `stop()`: Stops MQTT.
- `addMessageListener(listener)`: Adds callbacks.
- `removeMessageListener(listener)`: Removes callbacks.


## Feedback

You can use the **GitHub Issue** or [**tickets**](https://service.console.tuya.com) to provide feedback on any problems you encounter.

## LICENSE

For more information, see the [LICENSE](LICENSE) file.