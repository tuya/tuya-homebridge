const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;

class ThermostatAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
        platform,
        homebridgeAccessory,
        deviceConfig,
        Accessory.Categories.THERMOSTAT,
        Service.Thermostat,
        [],
        false
    );
    this.statusArr = deviceConfig.status;
    this.functionArr = deviceConfig.functions ? deviceConfig.functions : [];
    this.temp_multiplier = this.getTempMultiplier(this.statusArr);
    this.temp_set_range = this.getTempSetDPRange(this.statusArr);
    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh;
    for (var statusMap of statusArr) {
      if (statusMap.code === 'temp_current' || statusMap.code === 'temp_current_f') {
        this.temperatureMap = statusMap;
        this.normalAsync(Characteristic.CurrentTemperature, this.parseTuyaTemp(this.temperatureMap.value), {
          minValue: -20,
          maxValue: statusMap.code == 'temp_current' ? 50 : 122,
          minStep: 0.1
        })

        const hbUnits = this.tuyaParamToHomeBridge(Characteristic.TemperatureDisplayUnits, this.temperatureMap);
        this.normalAsync(Characteristic.TemperatureDisplayUnits, hbUnits, {
          minValue: hbUnits,
          maxValue: hbUnits,
          validValues: [hbUnits]
        })
      }
      if (statusMap.code === 'temp_set' || statusMap.code === 'temp_set_f') {
        this.tempsetMap = statusMap
        this.normalAsync(Characteristic.TargetTemperature, this.parseTuyaTemp(this.tempsetMap.value), {
          minValue: this.temp_set_range.min,
          maxValue: this.temp_set_range.max,
          minStep: 0.5
        })
      }
      if (statusMap.code === 'mode') {
        this.heaterMode = statusMap;
        const currentMode = this.parseTuyaMode(this.heaterMode.value);
        this.normalAsync(Characteristic.CurrentHeatingCoolingState, currentMode > 2 ? 2 : currentMode, {
          validValues:[0, 1, 2]
        })
        this.normalAsync(Characteristic.TargetHeatingCoolingState, currentMode, {
          validValues:[0, 1, 2, 3]
        })
      }
    }
  }

  normalAsync(name, hbValue, props) {
    this.setCachedState(name, hbValue);
    if (this.isRefresh) {
      this.service
          .getCharacteristic(name)
          .updateValue(hbValue);
    } else {
      this.getAccessoryCharacteristic(name, props);
    }
  }

  normalAsyncBattery(name, hbValue, props) {
    this.setCachedState(name, hbValue);
    if (this.isRefresh) {
      this.battery
          .getCharacteristic(name)
          .updateValue(hbValue);
    } else {
      this.battery.getCharacteristic(name)
          .setProps(props || {})
          .on('get', callback => {
            if (this.hasValidCache()) {
              callback(null, this.getCachedState(name));
            }
          });
    }
  }

  getAccessoryCharacteristic(name, props) {
    this.service.getCharacteristic(name)
        .setProps(props || {})
        .on('get', callback => {
          if (this.hasValidCache()) {
            callback(null, this.getCachedState(name));
          }
        })
        .on('set', (value, callback) => {
          var param = this.getSendParam(name, value)
          if(!param) {
            callback();
            return;
          }
          this.platform.tuyaOpenApi.sendCommand(this.deviceId, param).then(() => {
            this.setCachedState(name, value);
            if(name == Characteristic.TargetHeatingCoolingState) {
              this.setCachedState(Characteristic.CurrentHeatingCoolingState, value > 2 ? 2 : value);
            }
            callback();
          }).catch((error) => {
            this.log.error('[SET][%s] Characteristic.TargetTemperature Error: %s', this.homebridgeAccessory.displayName, error);
            this.invalidateCache();
            callback(error);
          });
        });
  }

  getSendParam(name, value) {
    var code;
    var value;
    switch (name) {
      case Characteristic.TargetTemperature:
        const tempset = value;
        code = this.tempsetMap.code;
        value = this.convertToTuya(tempset);
        break;
      case Characteristic.TargetHeatingCoolingState:
        const modeset = value;
        code = this.heaterMode.code;
        value = this.convertToTuyaMode(modeset);
        break;
      default:
        return undefined;
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
      case Characteristic.TemperatureDisplayUnits:
        let units
        if (param.code === 'temp_current') {
          units = 0
        } else {
          units = 1
        }
        return units
      case Characteristic.StatusLowBattery:
        let value
        if (param >= 20) {
          value = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        } else {
          value = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
        }
        return value
    }
  }

  getTempSetDPRange(statusAttr) {
    let tempSetRange
    if (this.functionArr.length > 0) {
      for (const funcDic of this.functionArr) {
        let valueRange = JSON.parse(funcDic.values)
        let isnull = (JSON.stringify(valueRange) == "{}")
        switch (funcDic.code) {
          case 'temp_set':
            tempSetRange = isnull
             ? { 'min': 0, 'max': 50 }
             : { 'min': this.parseTuyaTemp(parseInt(valueRange.min)), 'max': this.parseTuyaTemp(parseInt(valueRange.max)) }
            break;
          case 'temp_set_f':
            tempSetRange = isnull
             ? { 'min': 32, 'max': 104 }
             : { 'min': this.parseTuyaTemp(parseInt(valueRange.min)), 'max': this.parseTuyaTemp(parseInt(valueRange.max)) }
            break;
          default:
            break;
        }
      }
    }
    // fallback from status map
    if (!tempSetRange) {
      return statusAttr.some((e) => e.code == 'temp_current_f')
         ? { 'min': 32, 'max': 104 }
         : {'min': 0, 'max': 50 };
    }
    return tempSetRange
  }

  convertToTuya(homebridgeTemp) {
    return homebridgeTemp * this.temp_multiplier;
  }

  parseTuyaTemp(tuyaTemp) {
    return tuyaTemp / this.temp_multiplier;
  }

  convertToTuyaMode(homebridgeMode) {
    if(homebridgeMode === 1) { // heat
      return 'manual';
    }
    if(homebridgeMode === 2) { // cool
      return 'holiday';
    }
    return 'auto';
  }

  parseTuyaMode(tuyaMode) {
    if(tuyaMode === 'manual') {
      return 1; // heat
    }
    if(tuyaMode === 'holiday' || tuyaMode == 'holidayready') {
      return 2; // cool
    }
    return 3; // auto
  }

  getTempMultiplier(statusAttr) {
    var temp = statusAttr.find((e) => e.code == 'temp_current');
    var tempf = statusAttr.find((e) => e.code == 'temp_current_f');
    return temp.value > 100 || tempf.value > 200 ? 10 : 1;
  }

  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }
}

module.exports = ThermostatAccessory;
