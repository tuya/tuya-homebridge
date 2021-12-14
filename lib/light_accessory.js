const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class LightAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig, deviceData) {
    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.LIGHTBULB,
      Service.Lightbulb,
      deviceData.subType
    );
    this.statusArr = deviceConfig.status ? deviceConfig.status : [];
    this.functionArr = deviceConfig.functions ? deviceConfig.functions : [];
    //Distinguish Tuya different devices under the same HomeBridge Service
    this.deviceCategorie = deviceConfig.category;

    //get Lightbulb dp range
    this.function_dp_range = this.getDefaultDPRange()

    // if (this.functionArr.length != 0) {
    //   this.function_dp_range = this.getFunctionsDPRange()
    // }else{
    //   this.function_dp_range = this.getDefaultDPRange()
    // }

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh;

    if (this.subServices.length == 0 || this.subServices.length == 1) {
      this._refreshSingleAccessoryServiceIfNeed(this.service, statusArr, '1');
    } else {
      for (var subType of this.subServices) {
        this._refreshSingleAccessoryServiceIfNeed(this.homebridgeAccessory.getService(subType), statusArr, this._getSubTypePostfix(subType));
      }
    }
  }
  _getSubTypeService(subType) {
    let service 
    if (this.subServices.length == 0 || this.subServices.length == 1) {
      service = this.service;
    } else {
      service = this.homebridgeAccessory.getService(subType);
    }
    return service;
  }

  _refreshSingleAccessoryServiceIfNeed(service, statusArr, postfix) {
    for (var statusMap of statusArr) {
      var codePostifx = this._getSubTypePostfix(statusMap.code);
      if (!(codePostifx === postfix || (postfix === '1' && statusMap.code === codePostifx))) {
        continue;
      }

      if (statusMap.code === 'work_mode') {
        this.workMode = statusMap;
      }
      if (statusMap.code === 'switch_led' || statusMap.code === 'switch_led_1' || statusMap.code === 'switch_led_2') {
        this._storeCommandCode(service, Characteristic.On, statusMap);
        this.normalAsync(service, Characteristic.On, statusMap.value);
      }
      if (statusMap.code === 'bright_value' || statusMap.code === 'bright_value_v2' || statusMap.code === 'bright_value_1' || statusMap.code === 'bright_value_2') {
        this._storeCommandCode(service, Characteristic.Brightness, statusMap);
        var rawValue;
        var percentage;
        rawValue = statusMap.value;
        percentage = Math.floor((rawValue - this.function_dp_range.bright_range.min) * 100 / (this.function_dp_range.bright_range.max - this.function_dp_range.bright_range.min)); //    $
        this.normalAsync(service, Characteristic.Brightness, percentage > 100 ? 100 : percentage)
      }
      if (statusMap.code === 'temp_value' || statusMap.code === 'temp_value_v2') {
        this._storeCommandCode(service, Characteristic.ColorTemperature, statusMap);
        
        var rawValue;
        var temperature;
        rawValue = statusMap.value;
        temperature = Math.floor((rawValue - this.function_dp_range.temp_range.min) * 360 / (this.function_dp_range.temp_range.max - this.function_dp_range.temp_range.min) + 140); // ra$
        if (temperature > 500) {
          temperature = 500
        }
        if (temperature < 140) {
          temperature = 140
        }
        this.normalAsync(service, Characteristic.ColorTemperature, temperature)
      }
      if (statusMap.code === 'colour_data' || statusMap.code === 'colour_data_v2') {
        this._storeCommandCode(service, Characteristic.Hue, statusMap);
        this.colourObj = statusMap.value === "" ? { "h": 100.0, "s": 100.0, "v": 100.0 } : JSON.parse(statusMap.value)

        if (!this._isHaveDPCodeOfBrightValue()) {
          var percentage;
          percentage = Math.floor((this.colourObj.v - this.function_dp_range.bright_range.min) * 100 / (this.function_dp_range.bright_range.max - this.function_dp_range.bright_range.min));
          this.normalAsync(service, Characteristic.Brightness, percentage > 100 ? 100 : percentage)
        }

        const hue = this.colourObj.h; // 0-359
        this.normalAsync(service, Characteristic.Hue, hue)

        var saturation;
        saturation = Math.floor((this.colourObj.s - this.function_dp_range.saturation_range.min) * 100 / (this.function_dp_range.saturation_range.max - this.function_dp_range.saturation_range.min));  // saturation 0-100
        this.normalAsync(service, Characteristic.Saturation, saturation > 100 ? 100 : saturation)

      }
    }
  }

  normalAsync(service, name, hbValue) {
    this.setCachedState(service.displayName, name, hbValue);
    if (this.isRefresh) {
      service
        .getCharacteristic(name)
        .updateValue(hbValue);
    } else {
      this.getAccessoryCharacteristic(service, name);
    }
  }

  getAccessoryCharacteristic(service, name) {
    //set  Accessory service Characteristic
    service.getCharacteristic(name)
      .on('get', callback => {
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(service.displayName, name));
        }
      })
      .on('set', (value, callback) => {
        this.log.error('[value]: %s', value);

        //Switching colors will trigger both hue and saturation to avoid the color command being sent repeatedly.
        //So the saturation is saved and is sent with the hue
        if (name == Characteristic.Saturation) {
          this.setCachedState(service.displayName, name, value);
          callback();
          return;
        }
        var param = this.getSendParam(service.displayName, name, value)
        this.platform.tuyaOpenApi.sendCommand(this.deviceId, param).then(() => {
          this.setCachedState(service.displayName, name, value);
          callback();
        }).catch((error) => {
          this.log.error('[SET][%s] Characteristic Error: %s', this.homebridgeAccessory.displayName, error);
          this.invalidateCache();
          callback(error);
        });
      });
  }

  //get Command SendData
  getSendParam(serviceName, name, value) {

    var code;
    var value;
    switch (name) {
      case Characteristic.On:
        const isOn = value ? true : false;
        code = this._resolveCommandCode(serviceName, Characteristic.On);
        value = isOn;
        break;
      case Characteristic.ColorTemperature:
        var temperature;
        temperature = Math.floor((value - 140) * (this.function_dp_range.temp_range.max - this.function_dp_range.temp_range.min) / 360 + this.function_dp_range.temp_range.min); // value 140~500
        code = this._resolveCommandCode(serviceName, Characteristic.ColorTemperature);
        value = temperature;
        break;
      case Characteristic.Brightness:
        {
          var percentage;
          percentage = Math.floor((this.function_dp_range.bright_range.max - this.function_dp_range.bright_range.min) * value / 100 + this.function_dp_range.bright_range.min); //  value 0~100
         
          // turn light on/off in brightness goes to/from 0 percent
          if(percentage == 0 && this.getCachedState(serviceName, Characteristic.On)) {
            this.platform.tuyaOpenApi.sendCommand(this.deviceId, this.getSendParam(serviceName, Characteristic.On, false));
          } else if (percentage > 0 && !this.getCachedState(serviceName, Characteristic.On)) {
            this.platform.tuyaOpenApi.sendCommand(this.deviceId, this.getSendParam(serviceName, Characteristic.On, true));
          }
          
          // update brightness value
          if ((!this.workMode || this.workMode.value === 'white' || this.workMode.value === 'light_white') && this._isHaveDPCodeOfBrightValue()) {
            code = this._resolveCommandCode(serviceName, Characteristic.Brightness);
            value = percentage;
          } else {
            var saturation;
            saturation = Math.floor((this.function_dp_range.saturation_range.max - this.function_dp_range.saturation_range.min) * this.getCachedState(serviceName, Characteristic.Saturation) / 100 + this.function_dp_range.saturation_range.min); // value 0~100
            var hue = this.getCachedState(serviceName, Characteristic.Hue);; // 0-359
            code = this._resolveCommandCode(serviceName, Characteristic.Hue);
            value = {
              "h": hue,
              "s": saturation,
              "v": percentage
            };
          }
        }
        break;
      case Characteristic.Hue:
        var bright;
        var saturation;
        bright = Math.floor((this.function_dp_range.bright_range.max - this.function_dp_range.bright_range.min) * this.getCachedState(serviceName, Characteristic.Brightness) / 100 + this.function_dp_range.bright_range.min); //  value 0~100
        saturation = Math.floor((this.function_dp_range.saturation_range.max - this.function_dp_range.saturation_range.min) * this.getCachedState(serviceName, Characteristic.Saturation) / 100 + this.function_dp_range.saturation_range.min);// value 0~100
        code = this._resolveCommandCode(serviceName, Characteristic.Hue);
        value = {
          "h": value,
          "s": saturation,
          "v": bright
        };
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

  // deviceConfig.functions is null, return defaultdpRange
  getDefaultDPRange() {
    let defaultBrightRange
    let defaultTempRange
    let defaultSaturationRange
    for (var statusMap of this.statusArr) {
      switch (statusMap.code) {
        case 'bright_value':
          if (this.deviceCategorie == 'dj' || this.deviceCategorie == 'dc') {
            defaultBrightRange = { 'min': 25, 'max': 255 }
          } else if (this.deviceCategorie == 'xdd' || this.deviceCategorie == 'fwd' || this.deviceCategorie == 'tgq' || this.deviceCategorie == 'dd' || this.deviceCategorie == 'tgkg') {
            defaultBrightRange = { 'min': 10, 'max': 1000 }
          }
          break;
        case 'bright_value_1':
        case 'bright_value_v2':
          defaultBrightRange = { 'min': 10, 'max': 1000 }
          break;
        case 'temp_value':
          if (this.deviceCategorie == 'dj' || this.deviceCategorie == 'dc') {
            defaultTempRange = { 'min': 0, 'max': 255 }
          } else if (this.deviceCategorie == 'xdd' || this.deviceCategorie == 'fwd' || this.deviceCategorie == 'dd') {
            defaultTempRange = { 'min': 0, 'max': 1000 }
          }
          break;
        case 'temp_value_v2':
          defaultTempRange = { 'min': 0, 'max': 1000 }
          break;
        case 'colour_data':
          if (this.deviceCategorie == 'dj' || this.deviceCategorie == 'dc') {
            defaultSaturationRange = { 'min': 0, 'max': 255 }
            defaultBrightRange = { 'min': 25, 'max': 255 }
          } else if (this.deviceCategorie == 'xdd' || this.deviceCategorie == 'fwd' || this.deviceCategorie == 'dd') {
            defaultSaturationRange = { 'min': 0, 'max': 1000 }
            defaultBrightRange = { 'min': 10, 'max': 1000 }
          }
          break;
        case 'colour_data_v2':
          defaultSaturationRange = { 'min': 0, 'max': 1000 }
          defaultBrightRange = { 'min': 10, 'max': 1000 }
          break;
        default:
          break;
      }
    }
    return {
      bright_range: defaultBrightRange,
      temp_range: defaultTempRange,
      saturation_range: defaultSaturationRange,
    }
  }

  //Check whether the device supports bright_value dp code to control brightness
  _isHaveDPCodeOfBrightValue() {
    const brightDic = this.statusArr.find((item, index) => { return item.code.indexOf("bright_value") != -1 });
    if (brightDic) {
      return true;
    } else {
      return false;
    }
  }

  _getSubTypePostfix(code) {
    return code.substring(code.lastIndexOf('_') + 1);
  }

  _storeCommandCode(service, characteristic, statusMap) {
    if(!this.commands) {
      this.commands = {};
    }
    if(!this.commands[service.displayName]) {
      this.commands[service.displayName] = {};
    }
    this.commands[service.displayName][characteristic] = statusMap.code;
  }

  _resolveCommandCode(serviceName, characteristic) {
    if(!this.commands[serviceName][characteristic] && characteristic == Characteristic.On) {
      return serviceName;
    }
    return this.commands[serviceName][characteristic];
  }

  getCachedState(serviceName, characteristic) {
    return this.cachedState.get(serviceName + characteristic);
  }

  setCachedState(serviceName, characteristic, value) {
    this.cachedState.set(serviceName + characteristic, value);
    this.validCache = true;
  }


  // //return functionsdpRange
  // getFunctionsDPRange() {
  //   let bright_range
  //   let temp_range
  //   let saturation_range
  //   for (const funcDic of this.functionArr) {
  //     let valueRange = JSON.parse(funcDic.values)
  //     let isnull = (JSON.stringify(valueRange) == "{}")
  //     switch (funcDic.code) {
  //       case 'bright_value':
  //         let defaultBrightRange
  //         if (this.deviceCategorie == 'dj') {
  //           defaultBrightRange = { 'min': 25, 'max': 255 }
  //         }else if (this.deviceCategorie == 'xdd' || this.deviceCategorie == 'fwd') {
  //           defaultBrightRange = { 'min': 10, 'max': 1000 }
  //         }
  //         bright_range = isnull ? defaultBrightRange: { 'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max) }
  //         break;
  //       case 'bright_value_v2':
  //         bright_range = isnull ? { 'min': 10, 'max': 1000 }: { 'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max) }
  //         break;
  //       case 'temp_value':
  //         let defaultTempRange
  //         if (this.deviceCategorie == 'dj') {
  //           defaultTempRange = { 'min': 0, 'max': 255 }
  //         }else if (this.deviceCategorie == 'xdd' || this.deviceCategorie == 'fwd') {
  //           defaultTempRange = { 'min': 0, 'max': 1000 }
  //         }
  //         temp_range = isnull ? defaultTempRange: { 'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max) }
  //         break;
  //       case 'temp_value_v2':
  //         temp_range = isnull ? { 'min': 0, 'max': 1000 }: { 'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max) }
  //         break;
  //       case 'colour_data':
  //         let defaultSaturationRange
  //         if (this.deviceCategorie == 'dj') {
  //           defaultSaturationRange = { 'min': 0, 'max': 255 }
  //         }else if (this.deviceCategorie == 'xdd' || this.deviceCategorie == 'fwd') {
  //           defaultSaturationRange = { 'min': 0, 'max': 1000 }
  //         }
  //         saturation_range = isnull ? defaultSaturationRange: { 'min': parseInt(valueRange.s.min), 'max': parseInt(valueRange.s.max) }
  //         break;
  //       case 'colour_data_v2':
  //         saturation_range = isnull ? { 'min': 0, 'max': 1000 }: { 'min': parseInt(valueRange.s.min), 'max': parseInt(valueRange.s.max) }
  //         break;
  //       default:
  //         break;
  //     }
  //   }
  //   return {
  //     bright_range: bright_range,
  //     temp_range: temp_range,
  //     saturation_range: saturation_range,
  //   }
  // }

  //update device status
  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }
}

module.exports = LightAccessory;
