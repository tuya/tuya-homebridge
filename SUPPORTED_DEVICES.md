# Supported Tuya Devices

First-class category name, sedond-class category name, category code can be found here:
https://developer.tuya.com/docs/iot/standarddescription?id=K9i5ql6waswzq

Most category code is pinyin abbreviation of Chinese name.

## Lighting

| Name | Name (zh) | Code | Homebridge Service | Supported |
| ---- | ---- | ---- | ---- | ---- |
| Light | 光源 | dj | Light | ✅ |
| Ceiling Light | 吸顶灯 | xdd | Light | ✅ |
| Ambiance Light | 氛围灯 | fwd | Light | ✅ |
| String Lights | 灯串 | dc | Light | ✅ |
| Strip Lights | 灯带 | dd | Light | ✅ |
| Motion Sensor Light | 感应灯 | gyd | | |
| Ceiling Fan Light | 风扇灯 | fsd | | |
| Solar Light | 太阳能灯 | tyndj | | |
| Dimmer | 调光器 | tgq | Light | ✅ |
| Remote Control | 遥控器 | ykq | | |
| Spotlight | 射灯 | sxd | | |


## Electrical Products

| Name | Name (zh) | Code | Homebridge Service | Supported |
| ---- | ---- | ---- | ---- | ---- |
| Switch | 开关 | kg, tdq | Switch | ✅ |
| Socket | 插座 | cz | Outlet | ✅ |
| Power Strip | 排插 | pc | Outlet | ✅ |
| Scene Switch | 场景开关 | cjkg | | |
| Card Switch | 插卡取电开关 | ckqdkg | | |
| Curtain Switch | 窗帘开关 | clkg | | |
| Garage Door Opener | 车库门控制器 | ckmkzq | Garage Door Opener | ✅ |
| Dimmer Switch | 调光开关 | tgkg | Light | ✅ |
| Fan Switch | 风扇开关 | fskg | Fanv2 | ✅ |
| Wireless Switch | 无线开关 | wxkg | | |


## Large Home Appliances

| Name | Name (zh) | Code | Homebridge Service | Supported |
| ---- | ---- | ---- | ---- | ---- |
| Heater | 热水器 | rs | | |
| Ventilation System | 新风机 | xfj | | |
| Refrigerator | 冰箱 | bx | | |
| Bathtub | 浴缸 | yg | | |
| Washing Machine | 洗衣机 | xy | | |
| Air Conditioner | 空调 | kt | | |
| Air Conditioner Controller | 空调控制器 | ktkzq | | |
| Boiler | 壁挂炉 | bgl | | |


## Small Home Appliances

| Name | Name (zh) | Code | Homebridge Service | Supported |
| ---- | ---- | ---- | ---- | ---- |
| Robot Vacuum | 扫地机 | sd | | |
| Heater | 取暖器 | qn | Heater Coller | ✅ |
| Air Purifier | 空气净化器 | kj | Air Purifier | ✅ |
| Drying Rack | 晾衣架 | lyj | | |
| Diffuser | 香薰机 | xxj | | |
| Curtain | 窗帘 | cl | Window Covering | ✅ |
| Door and Window Controller | 门窗控制器 | mc | | |
| Thermostat | 温控器 | wk | | |
| Bathroom Heater | 浴霸 | yb | | |
| Irrigator | 灌溉器 | ggq | | |
| Humidifier | 加湿器 | jsq | | |
| Dehumidifier | 除湿机 | cs | | |
| Fan | 风扇 | fs | Fanv2 | ✅ |
| Water Purifier | 净水器 | js | | |
| Electric Blanket | 电热毯 | dr | | |
| Pet Treat Feeder | 宠物弹射喂食器 | cwtswsq | | |
| Pet Ball Thrower | 宠物网球发射器 | cwwqfsq | | |
| HVAC | 暖通器 | ntq | | |
| Pet Feeder | 宠物喂食器 | cwwsq | | |
| Pet Fountain | 宠物饮水机 | cwysj | | |
| Sofa | 沙发 | sf | | |
| Electric Fireplace | 电壁炉 | dbl | | |
| Smart Milk Kettle | 智能调奶器 | tnq | | |
| Cat Toilet | 猫砂盆 | msp | | |
| Towel Rack | 毛巾架 | mjj | | |
| Smart Indoor Garden | 植物生长机 | sz | | |


## Kitchen Appliances

| Name | Name (zh) | Code | Homebridge Service | Supported |
| ---- | ---- | ---- | ---- | ---- |
| Smart Kettle | 电茶壶 | bh | | |
| Bread Maker | 面包机 | mb | | |
| Coffee Maker | 咖啡机 | kfj | | |
| Bottle Warmer | 暖奶器 | nnq | | |
| Milk Dispenser | 冲奶机 | cn | | |
| Sous Vide Cooker | 慢煮机 | mzj | | |
| Rice Cabinet | 米柜 | mg | | |
| Induction Cooker | 电磁炉 | dcl | | |
| Air Fryer | 空气炸锅 | kqzg | | |
| Bento Box | 智能饭盒 | znfh | | |


## Security & Video Surveillance

| Name | Name (zh) | Code | Homebridge Service | Supported |
| ---- | ---- | ---- | ---- | ---- |
| Alarm Host | 报警主机 | mal | | |
| Smart Camera | 智能摄像机 | sp | | |
| Siren Alarm | 声光报警传感器 | sgbj | | |
| Gas Alarm | 燃气报警传感器 | rqbj | Leak Sensor | ✅ |
| Smoke Alarm | 烟雾报警传感器 | ywbj | Smoke Sensor | ✅ |
| Temperature and Humidity Sensor | 温湿度传感器 | wsdcg | Temperature Sensor, Humidity Sensor | ✅ |
| Contact Sensor | 门磁传感器 | mcs | Contact Sensor | ✅ |
| Vibration Sensor | 震动传感器 | zd | | |
| Water Detector | 水浸传感器 | sj | Leak Sensor | ✅ |
| Luminance Sensor | 亮度传感器 | ldcg | Light Sensor | ✅ |
| Pressure Sensor | 压力传感器 | ylcg | | |
| Emergency Button | 紧急按钮 | sos | | |
| PM2.5 Detector | PM2.5传感器 | pm25 | | |
| CO Detector | CO报警传感器 | cobj | Leak Sensor | ✅ |
| CO2 Detector | CO2报警传感器 | co2bj | | |
| Multi-functional Sensor | 多功能传感器 | dgnbj | | |
| Methane Detector | 甲烷报警传感器 | jwbj | Leak Sensor | ✅ |
| Human Motion Sensor | 人体运动传感器 | pir | | |
| Human Presence Sensor | 人体存在传感器 | hps | | |
| Smart Lock | 智能门锁 | ms | | |
| Environmental Detector | 环境检测仪 | hjjcy | | |


## Exercise & Health

| Name | Name (zh) | Code | Homebridge Service | Supported |
| ---- | ---- | ---- | ---- | ---- |
| Massage Chair | 按摩椅 | amy | | |
| Physiotherapy Products| 理疗产品 | liliao | | |
| Smart Jump Rope | 跳绳 | ts | | |
| Body Fat Scale | 体脂秤 | tzc1 | | |
| Smart Watch/Fitness Tracker | 手表/手环 | sb | | |
| Smart Pill Box | 智能药盒 | znyh | | |


## Gateway Control

| Name | Name (zh) | Code | Homebridge Service | Supported |
| ---- | ---- | ---- | ---- | ---- |
| Multifunctional Gateway | 多功能网关 | wg | | |


## Energy

| Name | Name (zh) | Code | Homebridge Service | Supported |
| ---- | ---- | ---- | ---- | ---- |
| Smart Electricity Meter | 智能电表 | zndb | | |
| Smart Water Meter | 智能水表 | znsb | | |
| Circuit Breaker | 断路器 | dlq | | |


## Digital Entertainment

| Name | Name (zh) | Code | Homebridge Service | Supported |
| ---- | ---- | ---- | ---- | ---- |
| TV | 电视 | ds | | |
| Projector | 投影仪 | tyy | | |


## Outdoor Travel

| Name | Name (zh) | Code | Homebridge Service | Supported |
| ---- | ---- | ---- | ---- | ---- |
| Tracker | 定位器 | tracker | | |
