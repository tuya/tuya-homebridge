本文介绍如何在 macOS 上如何开发和使用涂鸦官方 HomeBridge 插件。

## 什么是 HomeKit
HomeKit 是苹果 2014 年发布的智能家居平台。借助 HomeKit，用户可以使用苹果设备控制家里所有标有“Works with Apple HomeKit”（兼容 Apple HomeKit）的设备。这些设备包括灯、锁、恒温器和智能插头等。

## 什么是 HomeBridge
HomeBridge 是一个轻量级的 NodeJS 服务器，可以在家庭网络上运行。它模拟了 iOS HomeKit API，支持 HomeBridge 插件，提供了各种第三方智能家居设备 API 和 HomeKit 之间的桥梁。
您可以轻松地通过 HomeBridge 来把第三方智能设备接入 HomeKit。在使用和开发 HomeBridge 插件之前，建议查看 [HomeBridge 官方介绍](https://github.com/homebridge/homebridge/blob/master/README.md)。

## 受众人群/潜在群体
HomeBridge 插件开发适合家里有比较多的智能设备的智能家居爱好者，以及爱折腾、爱玩电子设备且有一定的技术能力（通过简单的技术教程，会安装和使用）的用户。

## 开始前准备

### 注册信息准备
涂鸦应用注册信息会在将来用到。
请参考 [tuya-iot-app-sdk-python](https://github.com/tuya/tuya-iot-app-sdk-python/blob/master/README.md) 中的 **BeforeUse** 章节， 在[涂鸦 IoT 平台](https://iot.tuya.com) 上注册账号，创建对应的云开发项目，最后创建该账号下的资产、用户和云应用，获取到对应的用户名、密码、Access ID 和 Access Secret。

### 硬件准备
|硬件|说明|
|:----|:----|
|PC、树莓派或服务器|用于安装插件和启动服务。本文以苹果电脑为例进行演示。|
|智能设备|用于演示智能设备的接入和控制。|
|iOS 设备|用于控制 HomeKit。|

### 软件准备
|软件|说明|
|:----|:----|
|命令行工具|用户自行选择。本文使用 macOS 自带的 **终端**。|
|配网工具|[IoT App 配网工具](https://images.tuyacn.com/smart/docs/activate-tool-app-release.apk) 或 微信小程序（搜索关键词“涂鸦智能配网”）。|

## 安装
1. 打开终端工具。
    <img src="https://airtake-public-data-1254153901.cos.ap-shanghai.myqcloud.com/goat/20210422/84efef3d1ca1435a898455f0c4c7ed48.png" width="70%">
2. 参考 [HomeBridge 官方文档](https://github.com/homebridge/homebridge/blob/master/README.md) 安装 HomeBridge。
3. 安装 Tuya HomeBridge 插件。
    >**注意**：如果在安装过程中遇到问题，可尝试在命令行之前加上 sudo，将执行命令角色权限变更为管理员。
    1. 安装插件。
        ```
        npm install homebridge-tuya-platform
        ```
         ![](https://airtake-public-data-1254153901.cos.ap-shanghai.myqcloud.com/goat/20210422/7f7c8a97e9d74a32aca805371cce532f.png)       
    2. 等待安装完成，判断是否安装成功。详细过程可以参考下面的视频。

        [![asciicast](https://asciinema.org/a/t6GY37mDPbfeG6AXVxuwROBlC.svg)](https://asciinema.org/a/t6GY37mDPbfeG6AXVxuwROBlC?autoplay=1)
        
## 配置
在使用之前，需要先配置 HomeBridge 插件中的 config.json 文件。
1. 进入 homebridge-tuya-platform 目录。
    ```
    cd ./node_modules/homebridge-tuya-platform
    ```
2. 进入 config 目录。
    ```
    cd ./config 
    ```
3. 编辑 config.json 文件。
    ```
    vim config.json
    ```
4. 在 `options` 中填入注册信息准备过程中获取到的用户名、密码、Access ID 和 Access Secret。其中，`lang` 默认为 en，`endPoint` 为当前 Tuya open API 服务的域名。
        <img src="https://images.tuyacn.com/app/Hanh/config3.json.png" alt="编辑注册信息" style="zoom:100%;" />
5. 保存并退出编辑。

## 启动 Tuya HomeBridge 插件
1. 回到 homebridge-tuya-platform 根目录。
    ```
    cd ..
    ```
2. 启动插件。
    ```
    homebridge -D -U ./config/ -P ./ 
    ```
    [![asciicast](https://asciinema.org/a/2gaFGeKXZtEF1pmOhqTG41M30.svg)](https://asciinema.org/a/2gaFGeKXZtEF1pmOhqTG41M30?autoplay=1)
## 使用
打开苹果设备，在 App Store 中安装苹果官方“家庭” 应用软件，通过扫描启动插件步骤中的二维码，或者输入 8 位数字的 Pin 值（Pin 值也可在 Config.json 文件中找到）来添加配件。

## 开发插件与贡献代码
您可以 fork 仓库代码分支，按照安装、配置、使用 tuya 插件的步骤，将代码启动起来。

### 开发环境搭建
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

### 品类扩充
#### 一、插件的实现部分的原理简介
<img src="https://images.tuyacn.com/app/Hanh/principleflowchart.png" alt="7f02e6c5e6654a882713361ae88a679c" style="zoom:130%;" />

#### 二、需要关注的 js 文件
* 入口文件 index.js。在 addAccessory() 函数中新增你的品类，并创建对应的 xx_accessory.js 文件。
    <img src="https://images.tuyacn.com/app/Hanh/index.js.png" alt="7f02e6c5e6654a882713361ae88a679c" style="zoom:130%;" />

* 文件xx_accessory.js。在xx_accessory.js中，只需在 refreshAccessoryServiceIfNeed() 函数中遍历你所新增品类支持的 function，以及根据支持的 function 生成 Service 对应的 Characteristic。
    <img src="https://images.tuyacn.com/app/Hanh/xx_accessory.js.png" alt="7f02e6c5e6654a882713361ae88a679c" style="zoom:130%;" />
* 文件tuyaopenapi.js：设备相关接口。
* 文件tuyamqttapi.js：支持 MQTT 服务。


## 常见安装问题

请见 [HomeBridge](https://github.com/homebridge/homebridge/blob/master/README.md) Common Issues。

## Tuya Open API
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

## MQTT
- start() 启动mqtt
- stop() 停止mqtt
- addMessageListener(listener) 添加回调函数
- removeMessageListener(listener) 移除回调函数

## 问题反馈

您可以通过 **Github Issue** 或通过 [**工单**](https://service.console.tuya.com) 来进行反馈您所碰到的问题。

## LICENSE
更多信息请参考 [LICENSE](LICENSE) 文件。
