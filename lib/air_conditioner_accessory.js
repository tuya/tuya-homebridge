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
      }
      if (statusMap.code === 'temp_current') {
        this.temperatureMap = statusMap
      }
      if (statusMap.code === 'temp_set') {
        this.tempsetMap = statusMap
      }
      if (statusMap.code === 'mode') {
        this.modeMap = statusMap
      }
    }

    const hbSwitch = this.tuyaParamToHomeBridge(Characteristic.Active, this.switchMap);
    this.normalAsync(Characteristic.Active, hbSwitch)

    const currentTemp = this.tuyaParamToHomeBridge(Characteristic.CurrentTemperature, this.temperatureMap)
    this.normalAsync(Characteristic.CurrentTemperature, currentTemp, {
      minValue: -30,
      maxValue: 100,
      minStep: 1
    })

    this.normalAsync(Characteristic.TemperatureDisplayUnits, 0, {
      minValue: 0,
      maxValue: 0,
      validValues: [0]
    })

    const targetTemp = this.tuyaParamToHomeBridge(Characteristic.CoolingThresholdTemperature, this.tempsetMap);
    this.normalAsync(Characteristic.CoolingThresholdTemperature, targetTemp, {
      minValue: 16,
      maxValue: 32,
      minStep: 1
    })
    this.normalAsync(Characteristic.HeatingThresholdTemperature, targetTemp, {
      minValue: 16,
      maxValue: 32,
      minStep: 1
    })

    const currentMode = this.tuyaParamToHomeBridge(Characteristic.CurrentHeaterCoolerState, this.modeMap);
    this.normalAsync(Characteristic.CurrentHeaterCoolerState, currentMode, {
      minValue: 0,
      maxValue: 3,
      validValues: [0, 1, 2, 3]
    })

    const targetMode = this.tuyaParamToHomeBridge(Characteristic.TargetHeaterCoolerState, this.modeMap);
    this.normalAsync(Characteristic.TargetHeaterCoolerState, targetMode, {
      minValue: 0,
      maxValue: 2,
      validValues: [0, 1, 2]
    })
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
          this.log.error('[SET][%s] Characteristic Error: %s', this.homebridgeAccessory.displayName, error);
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
        value = value > 0;
        break;
      case Characteristic.TargetHeaterCoolerState:
        code = "mode";
        if (value === 2) {
          value = 'cold'
        }
        if (value === 1) {
          value = 'hot'
        }
        if (value === 0) {
          value = 'wind'
        }
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
        return param.value ? 1 : 0
      case Characteristic.CurrentHeaterCoolerState:
        if (param.value === 'cold') {
          return 3
        }
        if (param.value === 'hot') {
          return 2
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