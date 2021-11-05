const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class AirConditionerAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.AIR_CONDITIONER,
      Service.HeaterCooler
    );
    this.statusArr = deviceConfig.status;
    this.functionArr = deviceConfig.functions ? deviceConfig.functions : [];

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh;
    for (var statusMap of statusArr) {
      if (statusMap.code === 'switch') {
        this.switchMap = statusMap
        const hbSwitch = this.tuyaParamToHomeBridge(Characteristic.Active, this.switchMap);
        this.normalAsync(Characteristic.Active, hbSwitch)
        this.normalAsync(Characteristic.CurrentHeaterCoolerState, 2)
        this.normalAsync(Characteristic.TargetHeaterCoolerState, 1, {
          minValue: 1,
          maxValue: 1,
          validValues: [Characteristic.TargetHeaterCoolerState.HEAT]
        })
      }
      if (statusMap.code === 'temp_current') {
        this.temperatureMap = statusMap
        this.normalAsync(Characteristic.CurrentTemperature, this.temperatureMap.value, {
          minValue: 0,
          maxValue: 100,
          minStep: 1
        })

        const hbUnits = this.tuyaParamToHomeBridge(Characteristic.TemperatureDisplayUnits, this.temperatureMap);
        this.normalAsync(Characteristic.TemperatureDisplayUnits, hbUnits, {
          minValue: hbUnits,
          maxValue: hbUnits,
          validValues: [hbUnits]
        })
      }
      if (statusMap.code === 'temp_set') {
        this.tempsetMap = statusMap

        this.normalAsync(Characteristic.CoolingThresholdTemperature, this.tempsetMap.value, {
          minValue: 19,
          maxValue: 28,
          minStep: 1
        })
        this.normalAsync(Characteristic.HeatingThresholdTemperature, this.tempsetMap.value, {
          minValue: 19,
          maxValue: 28,
          minStep: 1
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

  getAccessoryCharacteristic(name, props) {
    //set  Accessory service Characteristic
    this.service.getCharacteristic(name)
      .setProps(props || {})
      .on('get', callback => {
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(name));
        }
      })
      .on('set', (value, callback) => {
        if (name == Characteristic.CurrentHeaterCoolerState ||
            name == Characteristic.CurrentTemperature ||
            name == Characteristic.TemperatureDisplayUnits) {
          callback();
          return;
        }
        var param = this.getSendParam(name, value)
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
  getSendParam(name, value) {
    var code;
    switch (name) {
      case Characteristic.Active:
        code = "switch";
        break;
      case Characteristic.TargetHeaterCoolerState:
        code = "mode";
        break;
      case Characteristic.CoolingThresholdTemperature:
      case Characteristic.HeatingThresholdTemperature:
        code = 'temp_set';
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
      case Characteristic.Active:
        let status
        if (param.value) {
          status = 1
        } else {
          status = 0
        }
        return status
      case Characteristic.CurrentHeaterCoolerState:
        if (param.value === 'cold') {
          return 3
        }
        if (param.value === 'hot') {
          return 2
        }
        if (param.value === 'wind') {
          return 1
        }
        return 0
      case Characteristic.TargetHeaterCoolerState:
        if (param.value === 'cold') {
          return 2
        }
        if (param.value === 'hot') {
          return 1
        }
        return 0
      case Characteristic.CurrentTemperature:
      case Characteristic.CoolingThresholdTemperature:
      case Characteristic.HeatingThresholdTemperature:
        return param.value
      case Characteristic.TemperatureDisplayUnits:
        return 0
    }
  }

  //update device status
  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }
}

module.exports = AirConditionerAccessory;