const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;

class TemperatureAndHumiditySensorAccessory extends BaseAccessory {

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

        this.humidityService = this.homebridgeAccessory.getService(Service.HumiditySensor);
        if (this.humidityService) {
            this.humidityService.setCharacteristic(Characteristic.Name, deviceConfig.name);
        } else {
            this.humidityService = this.homebridgeAccessory.addService(Service.HumiditySensor, deviceConfig.name);
        }

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
                this.normalAsync(this.service, Characteristic.CurrentTemperature, temperature);
            } else if (statusMap.code === 'va_humidity') {
                const humidity = statusMap.value;
                this.normalAsync(this.humidityService, Characteristic.CurrentRelativeHumidity, humidity);
            }
        }
    }

    /**
     * add get/set Accessory service Characteristic Listner
     * @param {*} service 
     * @param {*} name 
     */
    getAccessoryCharacteristic(service, name) {
        //set  Accessory service Characteristic
        service.getCharacteristic(name)
            .on('get', callback => {
                if (this.hasValidCache()) {
                    callback(null, this.getCachedState(name));
                }
            })
            .on('set', (hbValue, callback) => { });
    }

    /**
     * update HomeBridge state
     * @param {*} service HomeBridge Service
     * @param {*} name HomeBridge Name
     * @param {*} hbValue HomeBridge Value
     */
    normalAsync(service, name, hbValue) {
        //store homebridge value
        this.setCachedState(name, hbValue);
        if (this.isRefresh) {
            service
                .getCharacteristic(name)
                .updateValue(hbValue);
        } else {
            this.getAccessoryCharacteristic(service, name);
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

module.exports = TemperatureAndHumiditySensorAccessory;