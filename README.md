Homebridge-Tuya-Platform
========================
[中文版](README_zh.md) | [English](README_en.md)

HomeKit
========================
HomeKit is a smart home platform released by Apple in 2014. With HomeKit, users can control all of their home accessories labeled "Works with Apple HomeKit" using an iOS device. These include lights, locks, thermostats, smart plugs and other accessories.

HomeBridge & value
========================
[HomeBridge](https://github.com/homebridge/homebridge/blob/master/README.md) is a lightweight NodeJS server you can run on your home network that emulates the iOS HomeKit API. It supports Plugins, which are community-contributed modules that provide a basic bridge from HomeKit to various 3rd-party APIs provided by manufacturers of "smart home" devices. (Mind reading this documentation before using and developing the HomeBridge plug-in) 

Control terminal uniformity. Through HomeBridge, devices of different platforms (Xiaomi, Tuya, etc.) that do not support the HomeKit interface and protocol can be bridged to the same platform (HomeKit) for control and linkage, and integrated into the Apple ecosystem.

In addition: if you only have a full set of Tuya products at home, in fact, it is more recommended to use the graffiti intelligent APP with more complete functions, rather than the audience of HomeBridge.



User
========================
Smart home enthusiasts; There are more intelligent devices in the home; like to toss and play with electronic devices, and have certain skills (through simple technical tutorials, can install and use them)


Install & Use the plug-in
========================
What do you need to prepare
------------------------
#### I.Precondition
Please see the BeforeUse of [tuya-iot-app-sdk-python](https://github.com/tuya/tuya-iot-app-sdk-python/blob/master/README.md) 

You need to register an account in the Tuya IoT platform, create the corresponding project in the cloud development module, and then create the assets, users and cloud applications under the account, and then you can get the corresponding user name, password, Access ID and Access Secret.

#### II.Hardware
1. Used to install the plug-in, start the service. PC or Raspberry Pi or personal server.
2. IoT Smart Devices
3. Used for terminal control of HomeKit. iOS Devices.

#### III.Software
1. Terminal (command line tools)
2. Device distribution network (IoT APP network distribution tool Or WeChat applet) [IoT Network Distribution App](https://images.tuyacn.com/smart/docs/activate-tool-app-release.apk)

Install
------------------------
#### The example On Mac
#### I.Open the Terminal
<img src="https://images.tuyacn.com/app/Hanh/commandlineEN.png" alt="7f02e6c5e6654a882713361ae88a679c" style="zoom:20%;" />

#### II.Install HomeBridge
If you haven't already installed HomeBridge on your PC or Raspberry Pi or server, please to see [HomeBridge](https://github.com/homebridge/homebridge/blob/master/README.md) ,if already installed, please skip.
#### III.Install Tuya HomeBridge Plugin
If you encounter any problems with the installation, you may need to preface this command with sudo and change the permissions to administrator.

Install.  
Execute the command ``` npm install homebridge-tuya-platform ```

Expo:

[![asciicast](https://asciinema.org/a/t6GY37mDPbfeG6AXVxuwROBlC.svg)](https://asciinema.org/a/t6GY37mDPbfeG6AXVxuwROBlC?autoplay=1)


Configuration
------------------------
#### Configure the config.json file in the HomeBridge plug-in
1. Execute the command ```cd ./node_modules/homebridge-tuya-platform```. Go to the homebridge-tuya-platform directory.
2. Execute the command ```cd ./config ``` Go to the config directory.
3. Execute the command```vim config.json```. Edit the config.json file.
<img src="https://images.tuyacn.com/app/Hanh/config3.json.png" alt="7f02e6c5e6654a882713361ae88a679c" style="zoom:100%;" />

4. Enter the user name, password, Access ID, and Access Secret from the preconditions above in Options. The lang defaults to en, and the endPoint is the domain name of the current Tuya Open API service.
5. Save And Exit.

Expo:

[![asciicast](https://asciinema.org/a/WHrp2iHoelPTyYLFijQLRG7Jr.svg)](https://asciinema.org/a/WHrp2iHoelPTyYLFijQLRG7Jr?autoplay=1)

Start the plug-in service
------------------------
#### Start Tuya HomeBridge plugin
1. Execute the command ```cd ..``` Go back to the homebridge-tuya-platform root directory.
2. Execute the command ```homebridge -D -U ./config/ -P ./``` Start the plug-in.

Expo:

[![asciicast](https://asciinema.org/a/2gaFGeKXZtEF1pmOhqTG41M30.svg)](https://asciinema.org/a/2gaFGeKXZtEF1pmOhqTG41M30?autoplay=1)




Bridge To HomeKit
------------------------
Open the iOS device, find or download the Apple official App "Family" APP, and add accessories (scan the above QR code or enter the above 8-digit PIN value, which can also be found in the config. json file).


Contribution guide
========================
Start by forking the repository code branch and following the steps of installing, configuring, and using the Tuya plug-in to start the code.

Development environment
------------------------
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

Accessory expansion
------------------------
#### I.Plug-in implementation principle
<img src="https://images.tuyacn.com/app/Hanh/principleflowchartEN.png" alt="7f02e6c5e6654a882713361ae88a679c" style="zoom:130%;" />

#### II.Focus on a few JS files
1. The entry file index.js.
Add your category to the addAccessory() function and create the corresponding xx_accessy.js file.
<img src="https://images.tuyacn.com/app/Hanh/index.js.png" alt="7f02e6c5e6654a882713361ae88a679c" style="zoom:130%;" />

2. xx_accessory.js. In xx_accessory.js, simply by refreshAccessoryServiceIfNeed () function in traverse your new category support function, and according to the function of support to generate corresponding Characteristic Service.
<img src="https://images.tuyacn.com/app/Hanh/xx_accessory.js.png" alt="7f02e6c5e6654a882713361ae88a679c" style="zoom:130%;" />

3. tuyaopenapi.js. Device related interfaces.
4. tuyamqttapi.js. Support for MQTT services.

Common Issues
------------------------
Please go to [HomeBridge](https://github.com/homebridge/homebridge/blob/master/README.md) Common Issues


Tuya Open API
------------------------
- login(username, password). login
- getDeviceList(). Get all the equipment under the account assets (equipment corresponds to Accessory).
- get_assets(). Gets a list of human-actionable assets.
- getDeviceIDList(assetID).Query the list of device IDs under the asset.
- getDeviceFunctions(deviceID).Gets the device instruction set.
- getDeviceInfo(deviceID).Get individual device information.
- getDeviceListInfo(devIds = []). Batch access to device information.
- getDeviceStatus(deviceID). Gets the individual device state.
- getDeviceListStatus(devIds = []). Batch access to device status.
- sendCommand(deviceID, params). Issue device commands.

MQTT
------------------------
- start(). start mqtt
- stop(). stop mqtt
- addMessageListener(listener). Add a callback function.
- removeMessageListener(listener). Remove the callback function.


The problem of feedback
------------------------

You can use the **Github Issue** or [**tickets**](https://service.console.tuya.com) to provide feedback on any problems you encounter.

LICENSE
------------------------
See the [LICENSE](LICENSE) file for more information.
