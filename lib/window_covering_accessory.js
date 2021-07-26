const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;

class WindowCoveringAccessory extends BaseAccessory {

    constructor(platform, homebridgeAccessory, deviceConfig) {
        ({ Accessory, Characteristic, Service } = platform.api.hap);
        super(
            platform,
            homebridgeAccessory,
            deviceConfig,
            Accessory.Categories.WINDOW_COVERING,
            Service.WindowCovering
        );
        this.isRefesh = false;
        this.statusArr = deviceConfig.status;

        this.refreshAccessoryServiceIfNeed(this.statusArr, false);
    };

    /**
     * init Or refresh AccessoryService
     */
    refreshAccessoryServiceIfNeed(stateArr, isRefesh) {
        this.isRefesh = isRefesh;
        for (const statusMap of stateArr) {
            // Characteristic.TargetPosition
            if ( statusMap.code === 'percent_control') {
                this.percentControlMap = statusMap
                this.normalAsync(Characteristic.TargetPosition, this.percentControlMap.value , isRefesh);
            }
        
            if ( statusMap.code === 'percent_state') {
                // Characteristic.CurrentPosition
                this.positionMap = statusMap
                this.normalAsync(Characteristic.CurrentPosition, this.positionMap.value, isRefesh);

                // Characteristic.PositionState
                let hbValue = this.getHomeBridgeParam(Characteristic.PositionState, this.positionMap);
                this.normalAsync(Characteristic.PositionState, hbValue, isRefesh);
            }
        }
    }

    /**
     * add get/set Accessory service Characteristic Listner
     */
    getAccessoryCharacteristic(name) {
        //set  Accessory service Characteristic
        this.service.getCharacteristic(name)
            .on('get', callback => {
                if (this.hasValidCache()) {
                    callback(null, this.getCachedState(name));
                }
            })
            .on('set', (hbValue, callback) => {
                let tuyaParam = this.getTuyaParam(name, hbValue);
                this.platform.tuyaOpenApi.sendCommand(this.deviceId, tuyaParam).then(() => {
                    //store homebridge value
                    this.setCachedState(name, hbValue);
                    //store targetPosition value
                    this.targetPosition = hbValue;
                    callback();
                }).catch((error) => {
                    this.log.error('[SET][%s] Characteristic Error: %s', this.homebridgeAccessory.displayName, error);
                    this.invalidateCache();
                    callback(error);
                });
            });
    }



    /**
     * get Tuya param from HomeBridge param
     */
    getTuyaParam(name, hbParam) {
        let code;
        let value;
        if (Characteristic.TargetPosition === name) {
            code = this.percentControlMap.code;
            value = hbParam;
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

    /**
     * get HomeBridge param from tuya param
     */
    getHomeBridgeParam(name, tuyaParam) {
        if (Characteristic.PositionState === name) {
            if (this.targetPosition) {
                if (this.targetPosition > tuyaParam.value) {
                    return Characteristic.PositionState.INCREASING;
                }else if (this.targetPosition < tuyaParam.value) {
                    return Characteristic.PositionState.DECREASING;
                }else{
                    return Characteristic.PositionState.STOPPED;
                }
            }else{
                return Characteristic.PositionState.STOPPED;
            }
        } 
    }

    /**
     * update HomeBridge state
     * @param {*} name HomeBridge Name
     * @param {*} hbValue HomeBridge Value
     * @param {*} isRefesh  
     */
    normalAsync(name, hbValue, isRefresh) {
        //store homebridge value
        this.setCachedState(name, hbValue);
        if (isRefresh) {
            this.service
                .getCharacteristic(name)
                .updateValue(hbValue);
        } else {
            this.getAccessoryCharacteristic(name);
        }
    }

    /**
     * Tuya MQTT update device status
     */
    updateState(data) {
        this.refreshAccessoryServiceIfNeed(data.status, true);
    }

}

module.exports = WindowCoveringAccessory;