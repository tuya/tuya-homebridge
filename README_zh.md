Homebridge-Tuya-Platform
========================
[中文版](README_zh.md) | [English](README.md)

HomeKit
========================
HomeKit，是苹果2014年发布的智能家居平台。借助 HomeKit，用户可以使用 iOS 设备控制家里所有标有“Works with Apple HomeKit”（兼容 Apple HomeKit）的配件。这些配件包括灯、锁、恒温器、智能插头及其他配件。

HomeBridge以及其价值
========================
[HomeBridge](https://github.com/homebridge/homebridge/blob/master/README.md) （强烈介意在使用和开发HomeBridge插件之前阅读该文档）是一个轻量级的NodeJS服务器，你可以在你的家庭网络上运行，模拟了iOS HomeKit API。它支持HomeBridge插件，提供了从HomeKit到“智能家居”设备制造商提供的各种第三方api的基本桥梁。

控制终端统一性。通过HomeBridge可以把不支持HomeKit接口及协议的不同平台的设备（小米、涂鸦等）桥接到同一个平台（HomeKit）进行控制和联动，融入苹果生态。

另：如果家里只有全套涂鸦产品，其实更推荐使用功能更完善的涂鸦智能app，不是ha/hb的受众群体。

HomeAssistant：装在家庭网关，可以控制家里各类设备的一个控制入口。

受众人群/潜在群体
========================
智能家居爱好者；家里有比较多的智能设备；爱折腾、爱玩电子设备，有一定的技术（通过简单的技术教程，会安装和使用）

安装、使用该插件
========================
需要准备什么
------------------------
#### 一、前置条件
请参阅 [tuya-iot-app-sdk-python](https://github.com/tuya/tuya-iot-app-sdk-python/blob/master/README.md) 的 BeforeUse
需要在涂鸦IoT平台的注册账号，在云开发模块创建对应项目，然后创建该账号下的资产、用户和云应用，即可获取到对应的用户名、密码、Access ID和Access Secret。

#### 二、硬件
1. 用于安装插件、启动服务。 PC 或者 树莓派 或者 个人服务器
2. 智能设备
3. 用于终端控制HomeKit。iOS设备

#### 三、软件
1. 终端（命令行工具）
2. 设备配网（IoT App 配网工具 或 微信小程序） [IoT Network Distribution App](https://images.tuyacn.com/smart/docs/activate-tool-app-release.apk)

安装
------------------------
#### 示例操作环境是Mac
#### 一、打开终端
<img src="https://images.tuyacn.com/app/Hanh/commandlineZH.png" alt="7f02e6c5e6654a882713361ae88a679c" style="zoom:20%;" />

#### 二、安装HomeBridge
如果您的PC或者树莓派或者服务器还未安装过HomeBridge，请参阅 [HomeBridge](https://github.com/homebridge/homebridge/blob/master/README.md)，如已安装，请直接跳过。

#### 三、安装Tuya HomeBridge插件
如果安装遇到任何问题，可能需要在这个命令前面加上sudo，权限变更为管理员。

开始安装。
输入``` npm install homebridge-tuya-platform ```

Expo：

[![asciicast](https://asciinema.org/a/t6GY37mDPbfeG6AXVxuwROBlC.svg)](https://asciinema.org/a/t6GY37mDPbfeG6AXVxuwROBlC?autoplay=1)




配置
------------------------
#### 配置HomeBridge插件中的config.json文件
1. 执行该命令 ```cd ./node_modules/homebridge-tuya-platform```。进入homebridge-tuya-platform目录。
2. 执行 ```cd ./config ``` 进入config目录。
3. 执行```vim config.json```。编辑config.json文件。
<img src="https://images.tuyacn.com/app/Hanh/config3.json.png" alt="7f02e6c5e6654a882713361ae88a679c" style="zoom:100%;" />

4. 在options中填入上述前置条件中获取到的用户名、密码、Access ID和Access Secret，lang默认为en，endPoint为当前Tuya open API服务的域名。
5. 保存退出编辑。

Expo:

[![asciicast](https://asciinema.org/a/WHrp2iHoelPTyYLFijQLRG7Jr.svg)](https://asciinema.org/a/WHrp2iHoelPTyYLFijQLRG7Jr?autoplay=1)

启动
------------------------
#### 启动Tuya HomeBridge插件
1. 执行该命令 ```cd ..```回到homebridge-tuya-platform根目录。
2. 执行 ```homebridge -D -U ./config/ -P ./``` 命令。启动插件。

Expo:

[![asciicast](https://asciinema.org/a/2gaFGeKXZtEF1pmOhqTG41M30.svg)](https://asciinema.org/a/2gaFGeKXZtEF1pmOhqTG41M30?autoplay=1)



使用
------------------------
打开iOS设备，找到或者下载苹果官方应用“家庭”App，添加配件（扫描上面二维码或者输入上面8位数字的Pin值，Pin值也可在Config.json文件中找到）


开发插件、贡献代码
========================
fork仓库代码分支，按照安装、配置、使用tuya插件的步骤，将代码启动起来

开发环境搭建
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

品类扩充
------------------------
#### 一、插件的实现部分的原理简介
<img src="https://images.tuyacn.com/app/Hanh/principleflowchart.png" alt="7f02e6c5e6654a882713361ae88a679c" style="zoom:130%;" />

#### 二、关注几个js文件
1. 入口文件index.js。
在addAccessory()函数中新增你的品类，并创建对应的xx_accessory.js文件
<img src="https://images.tuyacn.com/app/Hanh/index.js.png" alt="7f02e6c5e6654a882713361ae88a679c" style="zoom:130%;" />

2. 文件xx_accessory.js。在xx_accessory.js中，只需在refreshAccessoryServiceIfNeed()函数中遍历你所新增品类支持的function，以及根据支持的function生成Service对应的Characteristic
<img src="https://images.tuyacn.com/app/Hanh/xx_accessory.js.png" alt="7f02e6c5e6654a882713361ae88a679c" style="zoom:130%;" />

3. 文件tuyaopenapi.js。设备相关接口。
4. 文件tuyamqttapi.js。支持mqtt服务。


FAQ
------------------------
常见安装问题
请见 [HomeBridge](https://github.com/homebridge/homebridge/blob/master/README.md) Common Issues



Tuya Open API
------------------------
- login(username, password) 登录
- getDeviceList() 获取账号资产下的所有设备（设备对应Accessory）
- get_assets() 获取人员可操作资产列表
- getDeviceIDList(assetID) 查询资产下的设备ID列表
- getDeviceFunctions(deviceID) 获取设备指令集
- getDeviceInfo(deviceID) 获取单个设备信息
- getDeviceListInfo(devIds = []) 批量获取设备信息
- getDeviceStatus(deviceID) 获取单个设备状态
- getDeviceListStatus(devIds = []) 批量获取设备状态
- sendCommand(deviceID, params) 下发设备命令




MQTT
------------------------
- start() 启动mqtt
- stop() 停止mqtt
- addMessageListener(listener) 添加回调函数
- removeMessageListener(listener) 移除回调函数




问题反馈
------------------------

您可以通过**Github Issue** 或通过 [**工单**](https://service.console.tuya.com) 来进行反馈您所碰到的问题

LICENSE
------------------------
更多信息请参考[LICENSE](LICENSE)文件
