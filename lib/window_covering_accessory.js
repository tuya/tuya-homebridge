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
        this.statusArr = deviceConfig.status;

        this.movingStartTime = null;
        this.movingDuration = null;
        this.updateTimer = null;
        this.cachedHbValue = 0;
        this.totalOpenDuration = 30;

        this.refreshAccessoryServiceIfNeed(this.statusArr, false);
    };

    /**
     * init Or refresh AccessoryService
     */
    refreshAccessoryServiceIfNeed(stateArr, isRefresh) {
        this.isRefresh = isRefresh;
        for (const statusMap of stateArr) {

            //Check whether 100% is fully on or fully off. If there is no dp point, 100% is fully off by default
            if (statusMap.code === 'situation_set') {
                this.fullySituationMap = statusMap
            }

            // Characteristic.TargetPosition
            if (statusMap.code === 'percent_control') {
                this.percentControlMap = statusMap
                const percent = this._getCorrectPercent(this.percentControlMap.value);
                this.cachedHbValue = percent;
                this.normalAsync(Characteristic.TargetPosition, percent);

                if (!this._isHaveDPCodeOfPercentState()) {
                    // Characteristic.CurrentPosition
                    this.normalAsync(Characteristic.CurrentPosition, percent);
                }

            }

            if (statusMap.code === 'position') {
                this.percentControlMap = statusMap
                const percent = this._getCorrectPercent(parseInt(this.percentControlMap.value))
                this.cachedHbValue = percent;
                this.normalAsync(Characteristic.TargetPosition, percent);

                if (!this._isHaveDPCodeOfPercentState()) {
                    // Characteristic.CurrentPosition
                    this.normalAsync(Characteristic.CurrentPosition, percent);
                }
            }

            if (statusMap.code === 'percent_state') {
                // Characteristic.CurrentPosition
                this.positionMap = statusMap
                this.normalAsync(Characteristic.CurrentPosition, this._getCorrectPercent(this.positionMap.value));

                this.normalAsync(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
            }
        }
    }

    /**
     * add get/set Accessory service Characteristic Listner
     */
    getAccessoryCharacteristic(name, props) {
        //set  Accessory service Characteristic
        this.service.getCharacteristic(name)
            .setProps(props || {})
            .on('get', callback => {
                if (this.hasValidCache()) {
                    callback(null, this.getCachedState(name));
                }
            })
            .on('set', (hbValue, callback) => {
                let percentValue = this._getCorrectPercent(hbValue)
                let tuyaParam = this.getTuyaParam(name, percentValue);

                this.platform.tuyaOpenApi.sendCommand(this.deviceId, tuyaParam).then(() => {
                    //store homebridge value
                    // this.log.debug("set blinds from: " + this.cachedHbValue + "; to: " + hbValue)
                    this.setCachedState(name, hbValue);

                    this.movingStartTime = new Date().getTime();
                    let movingDuration = Math.abs(hbValue - this.cachedHbValue) * (this.totalOpenDuration / 100 * 1000);
                    this.cachedHbValue = hbValue;

                    this.startUpdateTimer(hbValue, movingDuration);
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
            if (code === 'position' && !Number.isFinite(value)) {
                value = "" + hbParam;
            }
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
     * update HomeBridge state
     * @param {*} name HomeBridge Name
     * @param {*} hbValue HomeBridge Value
     */
    normalAsync(name, hbValue, props) {
        //store homebridge value
        this.setCachedState(name, hbValue);
        if (this.isRefresh) {
            this.service
                .getCharacteristic(name)
                .updateValue(hbValue);
        } else {
            this.getAccessoryCharacteristic(name, props);
        }
    }

    _getCorrectPercent(value) {
        var percent = value;
        if (this.fullySituationMap && this.fullySituationMap.value === 'fully_open') {
            return percent;
        } else {
            percent = 100 - percent;
            return percent;
        }
    }

    //Check whether the device supports percent_state dp code
    _isHaveDPCodeOfPercentState() {
        const percentStateDic = this.statusArr.find((item, index) => { return item.code.indexOf("percent_state") != -1 });
        if (percentStateDic) {
            return true;
        } else {
            return false;
        }
    }

    startUpdateTimer(targetValue, movingDuration) {
        this.stopUpdateTimer();
        let hbValue;
        if (this._getCorrectPercent(targetValue) > this._getCorrectPercent(this.cachedHbValue)) {
            hbValue = Characteristic.PositionState.INCREASING;
        } else if (this._getCorrectPercent(targetValue) < this._getCorrectPercent(this.cachedHbValue)) {
            hbValue = Characteristic.PositionState.DECREASING;
        }
        this.normalAsync(Characteristic.PositionState, hbValue);
        this.updateTimer = setTimeout(this.estimatedMovementStop.bind(this), movingDuration);
    }

    stopUpdateTimer() {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = null;
        }
    }

    estimatedMovementStop() {
        let refresh = this.isRefresh;
        this.isRefresh = true;
        this.normalAsync(Characteristic.TargetPosition, this.cachedHbValue);
        this.normalAsync(Characteristic.CurrentPosition, this.cachedHbValue);
        this.isRefresh = refresh;

        this.movingStartTime = null;
        this.movingDuration = null;
        this.stopUpdateTimer();
    }

    /**
     * Tuya MQTT update device status
     */
    updateState(data) {
        this.refreshAccessoryServiceIfNeed(data.status, true);
    }

}

module.exports = WindowCoveringAccessory;