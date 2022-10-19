const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class LeakSensorAccessory extends BaseAccessory {

    constructor(platform, homebridgeAccessory, deviceConfig) {
        ({ Accessory, Characteristic, Service } = platform.api.hap);
        super(
            platform,
            homebridgeAccessory,
            deviceConfig,
            Accessory.Categories.LEAK_SENSOR,
            Service.LeakSensor
        );
        this.statusArr = deviceConfig.status;
        //link https://developer.tuya.com/cn/docs/iot/s?id=K9gf48r2nq2x4
        let alarmArray = new Array();
        alarmArray.push('gas_sensor_status');
        alarmArray.push('gas_sensor_state');
        alarmArray.push('ch4_sensor_state');
        this.alarmArray = alarmArray
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
            if (this.alarmArray.indexOf(statusMap.code) != -1) {
                if ('alarm' === statusMap.value) {
                    this.normalAsync(Characteristic.LeakDetected, Characteristic.LeakDetected.LEAK_DETECTED);
                } else if ('normal' === statusMap.value) {
                    this.normalAsync(Characteristic.LeakDetected, Characteristic.LeakDetected.LEAK_NOT_DETECTED);
                } else {
                    // old version api like statusMap.code === gas_sensor_state
                    if ('1' === statusMap.value) {
                        this.normalAsync(Characteristic.LeakDetected, Characteristic.LeakDetected.LEAK_DETECTED);
                    } else if ('2' === statusMap.value) {
                        this.normalAsync(Characteristic.LeakDetected, Characteristic.LeakDetected.LEAK_NOT_DETECTED);
                    }
                }
            } else if (statusMap.code === 'battery_state') {
                this.batteryStateMap = statusMap
                let state = this.getHomeBridgeParam(Characteristic.StatusLowBattery, statusMap);
                this.normalAsync(Characteristic.StatusLowBattery, state);
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
     * get HomeBridge param from tuya param
     * @param {*} name 
     * @param {*} tuyaParam Tuya Param
     */
    getHomeBridgeParam(name, tuyaParam) {
        if (Characteristic.StatusLowBattery === name) {
            if ('low' === tuyaParam.value) {
                return Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
            } else {
                return Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            }
        }
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

module.exports = LeakSensorAccessory;