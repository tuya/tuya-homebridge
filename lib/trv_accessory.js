const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class TRVAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.THERMOSTAT,
      Service.Thermostat
    );
    this.statusArr = deviceConfig.status;
    this.functionArr = deviceConfig.functions ? deviceConfig.functions : [];


    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh;

    for (var statusMap of statusArr) {
      this.log.error('[TUYA - TRV] '+statusMap.code+' '+statusMap.value)
      if (statusMap.code === 'temp_current' || statusMap.code === 'temp_current_f') {
        this.temperatureMap = statusMap
        this.normalAsync(Characteristic.CurrentTemperature, this.temperatureMap.value/10, {
          minValue: 2,
          maxValue: 28,
          minStep: 1
        })

        const hbUnits = this.tuyaParamToHomeBridge(Characteristic.TemperatureDisplayUnits, this.temperatureMap);
        this.normalAsync(Characteristic.TemperatureDisplayUnits, hbUnits, {
          minValue: hbUnits,
          maxValue: hbUnits,
          validValues: [hbUnits]
        })
      }
      else if (statusMap.code === 'temp_set' || statusMap.code === 'temp_set_f') {
        this.temperatureMap = statusMap
        this.normalAsync(Characteristic.TargetTemperature, this.temperatureMap.value/10, {
          minValue: 2,
          maxValue: 28,
          minStep: 1
        })
      }
      else if (statusMap.code === 'mode' ) {
        this.modeMap = statusMap
        if (this.modeMap.value == "auto" || this.modeMap.value == "temp_auto")
        {
          this.normalAsync(Characteristic.TargetHeatingCoolingState, 3)
        }
        else if (this.modeMap.value == "manual"  ) {
          this.normalAsync(Characteristic.TargetHeatingCoolingState, 1)
        }
        else if (this.modeMap.value == "holiday"  ) {
          this.normalAsync(Characteristic.TargetHeatingCoolingState, 0)
        }
        else  {
          this.normalAsync(Characteristic.TargetHeatingCoolingState, 3)
        }
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
    // this.log.log("[TUYA - TRV] - "+name,props)
    this.service.getCharacteristic(name)
      .setProps(props || {})
      .on('get', callback => {
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(name));
        }
      })
      .on('set', (value, callback) => {
        if (name == Characteristic.TemperatureDisplayUnits) {
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
    var value;
    this.log.error('[TUYA - TRV] - getSendParam'+name+' \n\t value:'+value)
    switch (name) {
      case Characteristic.TargetHeatingCoolingState:
        if ( value > 1 ) {
          value = "auto"
          this.setCachedState(Characteristic.TargetTemperature, 8);
          this.service.getCharacteristic(Characteristic.TargetTemperature).updateValue(8);

        }
        else if ( value == 1 ) {
          value = "manual"
        }
        else {
          value = "holiday"
        }
        code = "mode";
        return {
          "commands": [
            {
              "code": code,
              "value": value
            }
          ]
        };
      case Characteristic.TargetTemperature :
        const tempset = value*10;
        code = "temp_set";
        value = tempset;


        this.setCachedState(Characteristic.TargetHeatingCoolingState, 1);
        this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(1);


        return {
          "commands": [
            {
              "code": code,
              "value": value
            },
            {
              "code": "mode",
              "value": "manual"
            }
          ]
        };
      default:
        this.log.error("[TUYA - TRV] - Unknown Charcteristic",name)
        return {
          "commands": []
        }
    }

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
    }
  }


  //update device status
  updateState(data) {
      this.log.error('[TUYA - TRV] - Refreshing')
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }
}

module.exports = TRVAccessory;
