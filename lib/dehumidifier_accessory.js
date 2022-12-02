const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;


// based on options available for Tesla Smart Dehumidifier XL in Tuya Smart
function getNormalizedValue(value) {
    if (value > 80) {
        return 80;
    } else if (value > 60) {
        return 60;
    } else if (value > 40) {
        return 40;
    } else { 
        return 20;
    }
}

class DehumidifierAccessory extends BaseAccessory {
    constructor(platform, homebridgeAccessory, deviceConfig) {

        ({ Accessory, Characteristic, Service } = platform.api.hap);

        super(
            platform,
            homebridgeAccessory,
            deviceConfig,
            Accessory.Categories.AIR_DEHUMIDIFIER,
            Service.HumidifierDehumidifier
        );
        
        this.statusArr = deviceConfig.status ? deviceConfig.status : [];
        
        this.refreshAccessoryServiceIfNeed(this.statusArr, false);
    }

    //init Or refresh AccessoryService
    refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
        this.isRefresh = isRefresh;

        // it's not combined dehumidifier - humidifier, so let's always fallback to dehumidifier – quite dirty, but I guess works
        this.normalAsync(Characteristic.TargetHumidifierDehumidifierState, Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER)

        for (var statusMap of statusArr) {
            if (statusMap.code === 'switch') {
                const value = statusMap.value;
                this.normalAsync(Characteristic.Active, value)
                this.normalAsync(Characteristic.CurrentHumidifierDehumidifierState, value ? Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING : Characteristic.CurrentHumidifierDehumidifierState.INACTIVE)
            }

            if (statusMap.code === 'child_lock') {
                const value = statusMap.value;
                this.normalAsync(Characteristic.LockPhysicalControls, value ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
            }

            if (statusMap.code === 'dehumidify_set_value') {
                const value = statusMap.value;
                this.normalAsync(Characteristic.RelativeHumidityDehumidifierThreshold, value);
            }

            if (statusMap.code === 'humidity_indoor'){
                const value = statusMap.value;
                this.normalAsync(Characteristic.CurrentRelativeHumidity, value);
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
                    callback(null, this.getCachedState(name));
                }
            })
            .on('set', (value, callback) => {
                //Switching colors will trigger both hue and saturation to avoid the color command being sent repeatedly.
                //So the saturation is saved and is sent with the hue
                var param = this.getSendParam(name, value)
                // console.log("AirPurifierAccessory getCharacteristic set name.", name);
                // console.log("request id is :" + this.deviceId);
                this.platform.tuyaOpenApi.sendCommand(this.deviceId, param).then(() => {
                    this.setCachedState(name, value);
                    callback();
                }).catch((error) => {
                    this.log.error('[SET][%s] Error: %s', this.homebridgeAccessory.displayName, error);
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
            case Characteristic.RelativeHumidityDehumidifierThreshold:
                code = "dehumidify_set_value";
                value = getNormalizedValue(hbValue);
                break;
            case Characteristic.LockPhysicalControls:
                code = "child_lock";
                value = !!hbValue;
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


    //update device status
    updateState(data) {
        this.refreshAccessoryServiceIfNeed(data.status, true);
    }
}

module.exports = DehumidifierAccessory;
