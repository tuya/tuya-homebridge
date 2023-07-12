const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

const DEFAULT_SPEED_COUNT = 3;
class CameraAccessory extends BaseAccessory {
    constructor(platform, homebridgeAccessory, deviceConfig) {

        ({ Accessory, Characteristic, Service } = platform.api.hap);
        super(
            platform,
            homebridgeAccessory,
            deviceConfig,
            Accessory.Categories.SP,
            Service.CameraRTPStreamManagement
        );
        
        this.statusArr = deviceConfig.status ? deviceConfig.status : [];
        this.functionArr = deviceConfig.functions ? deviceConfig.functions : [];

        if (this.functionArr.length != 0) {
            this.speed_count = this.getSpeedFunction("speed")
        } else {
            this.speed_count = DEFAULT_SPEED_COUNT
        }

        this.speed_coefficient = 100 / this.speed_count

        this.refreshAccessoryServiceIfNeed(this.statusArr, false);
    }

    //init Or refresh AccessoryService
    refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
        this.isRefresh = isRefresh;
        for (var statusMap of statusArr) {
            if (statusMap.code === 'switch') {
                this.switchMap = statusMap;
                this.normalAsync(Characteristic.Active, this.switchMap.value)
                this.normalAsync(Characteristic.CurrentAirPurifierState, this.switchMap.value ? 2 : 0)
            }

            if (statusMap.code === "mode") {
                this.modeMap = statusMap;
                const hbAirPurifierValue = this.tuyaParamToHomeBridge(Characteristic.TargetAirPurifierState, this.modeMap.value)
                this.normalAsync(Characteristic.TargetAirPurifierState, hbAirPurifierValue)
            }

            if (statusMap.code === 'lock') {
                this.lockMap = statusMap;
                this.normalAsync(Characteristic.LockPhysicalControls, this.lockMap.value ? 0 : 1)
            }

            if (statusMap.code === 'speed' || statusMap.code === 'fan_speed_enum') {
                this.speedMap = statusMap;
                const hbSpeed = this.tuyaParamToHomeBridge(Characteristic.RotationSpeed, this.speedMap.value);
                this.normalAsync(Characteristic.RotationSpeed, hbSpeed)
            }
        }
    }


    normalAsync(name, hbValue) {
        this.setCachedState(name, hbValue);
        if (this.isRefresh) {
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
                    // console.log("CameraAccessory getCharacteristic get.", this.getCachedState(name));
                    callback(null, this.getCachedState(name));
                }
            })
            .on('set', (value, callback) => {
                //Switching colors will trigger both hue and saturation to avoid the color command being sent repeatedly.
                //So the saturation is saved and is sent with the hue
                var param = this.getSendParam(name, value)
                // console.log("CameraAccessory getCharacteristic set name.", name);
                // console.log("request id is :" + this.deviceId);
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
                let level = Math.floor(hbValue / this.speed_coefficient) + 1
                level = level > this.speed_count ? this.speed_count : level;
                code = this.speedMap.code
                if (this.speedMap.code === "fan_speed_enum") {
                    if (level == 1) {
                        value = "low";
                    }else if (level == 2) {
                        value = "mid";
                    }else {
                        value = "high";
                    }
                }else{
                    value = "" + level;
                }
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
                let speed
                if (this.speedMap.code === "fan_speed_enum") {
                    if (param === "mid") {
                        speed = parseInt(2 * this.speed_coefficient);
                    }else if (param === "high") {
                        speed = parseInt(3 * this.speed_coefficient);
                    }else{
                        speed = parseInt(1 * this.speed_coefficient);
                    }
                }else{
                    speed = parseInt(param * this.speed_coefficient);
                }
                return speed
        }
    }

    getSpeedFunction(code) {
        var funcDic = this.functionArr.find((item, index) => { return item.code == code })
        if (funcDic) {
            let value = JSON.parse(funcDic.values)
            let isnull = (JSON.stringify(value) == "{}")
            return isnull ? DEFAULT_SPEED_COUNT : value.range.length;
        }else{
            return DEFAULT_SPEED_COUNT;
        }
    }

    //update device status
    updateState(data) {
        this.refreshAccessoryServiceIfNeed(data.status, true);
        // console.log("CameraAccessory updateState devices", data);
    }
}

module.exports = CameraAccessory;
