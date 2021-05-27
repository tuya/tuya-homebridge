const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;
let speed_count
let speed_coefficient

class AirPurifierAccessory extends BaseAccessory {
    constructor(platform, homebridgeAccessory, deviceConfig) {

        ({Accessory, Characteristic, Service} = platform.api.hap);
        super(
            platform,
            homebridgeAccessory,
            deviceConfig,
            Accessory.Categories.AIR_PURIFIER,
            Service.AirPurifier
        );
        this.isRrefesh = false;

        this.functionArr = deviceConfig.functions;
        this.statusArr = deviceConfig.status;
        //Distinguish Tuya different devices under the same HomeBridge Service
        this.deviceCategorie = deviceConfig.category;
        speed_count = this.getSpeedFunction("speed")
        speed_coefficient = 100 / speed_count
        console.log("AirPurifierAccessory functionArr.", this.functionArr);
        console.log("AirPurifierAccessory statusArr.", this.statusArr);

        this.refreshAccessoryServiceIfNeed(this.statusArr, false);
    }

    //init Or refresh AccessoryService
    refreshAccessoryServiceIfNeed(statusArr, isRrefesh) {
        this.isRrefesh = isRrefesh;
        for (var statusMap of statusArr) {
            if (statusMap.code === 'switch') {
                this.switchMap = statusMap;
                this.normalAsync(Characteristic.Active, this.switchMap.value, this.isRrefesh)
                this.normalAsync(Characteristic.CurrentAirPurifierState, this.switchMap.value ? 2 : 0, this.isRrefesh)
            }

            if (statusMap.code === "mode") {
                console.log("model statues");
                this.modeMap = statusMap;
                const hbAirPurifierValue = this.tuyaParamToHomeBridge(Characteristic.TargetAirPurifierState, this.modeMap.value)
                this.normalAsync(Characteristic.TargetAirPurifierState, hbAirPurifierValue, this.isRrefesh)
            }

            if (statusMap.code === 'lock') {
                this.lockMap = statusMap;
                this.normalAsync(Characteristic.LockPhysicalControls, this.lockMap.value ? 0 : 1, this.isRrefesh)
            }

            if (statusMap.code === 'speed') {
                this.speedMap = statusMap;
                const hbSpeed = this.tuyaParamToHomeBridge(Characteristic.RotationSpeed, this.speedMap.value);
                this.normalAsync(Characteristic.RotationSpeed, hbSpeed, this.isRrefesh)
            }
        }
    }


    normalAsync(name, hbValue, isRefresh) {
        this.setCachedState(name, hbValue);
        if (isRefresh) {
            this.service
                .getCharacteristic(name)
                .updateValue(hbValue);
        } else {
            this.getAccessoryCharacteristic(name);
        }
    }

    getAccessoryCharacteristic(name) {
        //set  Accessory service Characteristic
        this.service.getCharacteristic(name)
            .on('get', callback => {
                if (this.hasValidCache()) {
                    console.log("AirPurifierAccessory getCharacteristic get.", this.getCachedState(name));
                    callback(null, this.getCachedState(name));
                }
            })
            .on('set', (value, callback) => {
                //Switching colors will trigger both hue and saturation to avoid the color command being sent repeatedly.
                //So the saturation is saved and is sent with the hue
                var param = this.getSendParam(name, value)
                console.log("AirPurifierAccessory getCharacteristic set name.", name);
                console.log("request id is :" + this.deviceId);
                this.platform.tuyaOpenApi.sendCommand(this.deviceId, param).then(() => {
                    this.setCachedState(name, value);
                    callback();
                }).catch((error) => {
                    this.log.error('[SET][%s] Characteristic.Brightness Error: %s', this.homebridgeAccessory.displayName, error);
                    this.invalidateCache();
                    callback(error);
                });
            });
    }

    //get Command SendData
    getSendParam(name, hbValue) {
        var code;
        var value;
        switch (name) {
            case Characteristic.Active:
                const isOn = hbValue ? true : false;
                code = "switch";
                value = isOn;
                break;
            case Characteristic.TargetAirPurifierState:
                code = "mode";
                value = hbValue == 1 ? "auto" : "manual";
                break;

            case Characteristic.LockPhysicalControls:
                code = "lock";
                value = hbValue == 1 ? false : true;
                break;
            case Characteristic.RotationSpeed: {
                let level = Math.floor(hbValue / speed_coefficient) + 1
                level = level > speed_count ? speed_count : level;
                code = "speed"
                value = "" + level;

            }
                break;
            default:
                break;
        }
        return {
            "commands": [
                {
                    "code": code,
                    "value": value
                }
            ]
        };
    }

    tuyaParamToHomeBridge(name, param) {
        switch (name) {
            case Characteristic.TargetAirPurifierState:
                let result = 1;
                if (param === "manual") {
                    result = 0
                }
                return result;
            case Characteristic.RotationSpeed:
                let speed = parseInt(param * speed_coefficient);
                return speed

        }

    }

    getSpeedFunction(code){
        var funcDic = this.functionArr.find((item, index) => {return item.code == code })
        let value = JSON.parse(funcDic.values)
        return value.range.length;
      }

    //update device status
    updateState(data) {
        this.refreshAccessoryServiceIfNeed(data.status, true);
        console.log("AirPurifierAccessory updateState devices", data);
    }
}

module.exports = AirPurifierAccessory;
