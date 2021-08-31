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
        true
    );
    this.statusArr = deviceConfig.status;
    this.functionArr = deviceConfig.functions ? deviceConfig.functions : [];
    this.temp_set_range = this.getTempSetDPRange();
    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh;
    for (var statusMap of statusArr) {
      if (statusMap.code === 'temp_current' || statusMap.code === 'temp_current_f') {
        this.temperatureMap = statusMap;
        this.normalAsync(Characteristic.CurrentTemperature, this.temperatureMap.value / 10, {
          minValue: -50,
          maxValue: 122,
          minStep: 1
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
        this.normalAsync(Characteristic.TargetTemperature, this.tempsetMap.value, {
          minValue: this.temp_set_range.min,
          maxValue: this.temp_set_range.max,
          minStep: 1
        })
        this.normalAsync(Characteristic.TargetHeatingCoolingState, 3, {
          validValues:[3]
        })
      }
      if (statusMap.code === 'battery_percentage') {
        this.batteryLevel = statusMap
        const hbBatteryStatus = this.tuyaParamToHomeBridge(Characteristic.StatusLowBattery, this.batteryLevel.value);
        this.normalAsyncBattery(Characteristic.BatteryLevel, this.batteryLevel.value);
        this.normalAsyncBattery(Characteristic.StatusLowBattery, hbBatteryStatus);
        this.normalAsyncBattery(Characteristic.ChargingState, 0);
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
          if (name != Characteristic.TargetTemperature) {
            callback();
            return;
          }
          var param = this.getSendParam(name, value)
          this.platform.tuyaOpenApi.sendCommand(this.deviceId, param).then(() => {
            this.setCachedState(name, value);
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
        value = tempset;
        break;
      default:
        break;
    }
    return {
      "commands": [
        {
          "code": code,
          "value": value
        },
        {
          "code": 'mode',
          "value": 'manual'
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

  getTempSetDPRange() {
    let tempSetRange
    if (this.functionArr.length > 0) {
      for (const funcDic of this.functionArr) {
        let valueRange = JSON.parse(funcDic.values)
        let isnull = (JSON.stringify(valueRange) == "{}")
        switch (funcDic.code) {
          case 'temp_set':
            tempSetRange = isnull ? { 'min': 0, 'max': 50 } : { 'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max) }
            break;
          case 'temp_set_f':
            tempSetRange = isnull ? { 'min': 32, 'max': 104 } : { 'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max) }
            break;
          default:
            break;
        }
      }
      if (!tempSetRange) {
        tempSetRange = {'min': 0, 'max': 104}
      }
    }
    return tempSetRange
  }

  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }
}

module.exports = ThermostatAccessory;
