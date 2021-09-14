const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class TemperatureSensorAccessory extends BaseAccessory {

    constructor(platform, homebridgeAccessory, deviceConfig) {
        ({ Accessory, Characteristic, Service } = platform.api.hap);
        super(
            platform,
            homebridgeAccessory,
            deviceConfig,
            Accessory.Categories.TEMPERATURE_SENSOR,
            Service.TemperatureSensor
        );
        this.statusArr = deviceConfig.status;

        this.refreshAccessoryServiceIfNeed(this.statusArr, false);
    };

    /**
     * init Or refresh AccessoryService
     * @param {*} stateArr 
     * @param {*} isRefresh 
     */
    refreshAccessoryServiceIfNeed(stateArr, isRefresh) {
        this.isRefresh = isRefresh;
        for (const statusMap of stateArr) {
            if (statusMap.code === 'va_temperature') {
                const temperature = statusMap.value / 10;
                this.normalAsync(Characteristic.CurrentTemperature, temperature);
            } else if (statusMap.code === 'humidity_value') {
                const humidity = statusMap.value;
                this.normalAsync(Characteristic.CurrentRelativeHumidity, humidity);
            }
        }
    }

    /**
     * add get/set Accessory service Characteristic Listner
     * @param {*} name 
     */
    getAccessoryCharacteristic(name) {
        //set  Accessory service Characteristic
        this.service.getCharacteristic(name)
            .on('get', callback => {
                if (this.hasValidCache()) {
                    callback(null, this.getCachedState(name));
                }
            })
            .on('set', (hbValue, callback) => { });
    }

    /**
     * update HomeBridge state
     * @param {*} name HomeBridge Name
     * @param {*} hbValue HomeBridge Value
     */
    normalAsync(name, hbValue) {
        //store homebridge value
        this.setCachedState(name, hbValue);
        if (this.isRefresh) {
            this.service
                .getCharacteristic(name)
                .updateValue(hbValue);
        } else {
            this.getAccessoryCharacteristic(name);
        }
    }

    /**
     * Tuya MQTT update device status
     * @param {*} data 
     */
    updateState(data) {
        this.refreshAccessoryServiceIfNeed(data.status, true);
    }

}

module.exports = TemperatureSensorAccessory;