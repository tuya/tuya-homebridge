const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;
let bright_range
let temp_range
let saturation_range

class LightAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.LIGHTBULB,
      Service.Lightbulb
    );
    this.isRefesh = false;
    this.statusArr = deviceConfig.status;
    this.functionArr = deviceConfig.functions;
    //Distinguish Tuya different devices under the same HomeBridge Service
    this.deviceCategorie = deviceConfig.category;

    console.log("LightAccessory statusArr.", this.statusArr);
    console.log("LightAccessory functionArr.", this.functionArr);
    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefesh) {
    this.isRefesh = isRefesh;
    for (var statusMap of statusArr) {
      if (statusMap.code === 'work_mode') {
        this.workMode = statusMap;
      }
      if (statusMap.code === 'switch_led') {
        this.switchLed = statusMap;
        this.setCachedState(Characteristic.On, this.switchLed.value);
        if (this.isRefesh) {
          this.service
            .getCharacteristic(Characteristic.On)
            .updateValue(this.switchLed.value);
        } else {
          this.getAccessoryCharacteristic(Characteristic.On);
        }
      }
      if (statusMap.code === 'bright_value' || statusMap.code === 'bright_value_v2') {
        this.brightValue = statusMap;
        bright_range = this.getFunction(statusMap.code)
        var rawValue;
        var percentage;
        rawValue = this.brightValue.value;
        percentage = Math.floor((rawValue - bright_range.min) * 100 / (bright_range.max - bright_range.min)); //    percentage 0~100
        this.setCachedState(Characteristic.Brightness, percentage > 100 ? 100:percentage);
        if (this.isRefesh) {
          this.service
            .getCharacteristic(Characteristic.Brightness)
            .updateValue(this.getCachedState(Characteristic.Brightness));
        } else {
          this.getAccessoryCharacteristic(Characteristic.Brightness);
        }
      }
      if (statusMap.code === 'temp_value' || statusMap.code === 'temp_value_v2') {
        this.tempValue = statusMap;
        temp_range = this.getFunction(statusMap.code)
        var rawValue;
        var temperature;
        rawValue = this.tempValue.value;
        temperature = Math.floor((rawValue - temp_range.min) * 360 / (temp_range.max - temp_range.min) + 140); // rawValue  0~1000  temperature 140~500
        if(temperature > 500){
          temperature = 500
        }
        if(temperature < 140){
          temperature = 140
        }
        this.setCachedState(Characteristic.ColorTemperature, temperature);
        if (this.isRefesh) {
          this.service
            .getCharacteristic(Characteristic.ColorTemperature)
            .updateValue(temperature);
        } else {
          this.getAccessoryCharacteristic(Characteristic.ColorTemperature);
        }
      }
      if (statusMap.code === 'colour_data' || statusMap.code === 'colour_data_v2') {
        this.colourData = statusMap;
        saturation_range = this.getFunction(statusMap.code)
        this.colourObj = JSON.parse(this.colourData.value)
        const hue = this.colourObj.h; // 0-359
        this.setCachedState(Characteristic.Hue, hue);

        var saturation;
        saturation = Math.floor((this.colourObj.s - saturation_range.min) * 100 / (saturation_range.max - saturation_range.min));  // saturation 0-100
        this.setCachedState(Characteristic.Saturation, saturation> 100 ? 100:saturation);

        if (this.isRefesh) {
          this.service
            .getCharacteristic(Characteristic.Hue)
            .updateValue(hue);
        } else {
          this.getAccessoryCharacteristic(Characteristic.Hue);
        }

        if (this.isRefesh) {
          this.service
            .getCharacteristic(Characteristic.Saturation)
            .updateValue(this.getCachedState(Characteristic.Saturation));
        } else {
          this.getAccessoryCharacteristic(Characteristic.Saturation);
        }
      }
    }
  }

  getAccessoryCharacteristic(name) {
    //set  Accessory service Characteristic
    this.service.getCharacteristic(name)
      .on('get', callback => {
        if (this.hasValidCache()) {
          console.log("LightAccessory getCharacteristic get.", this.getCachedState(name));
          callback(null, this.getCachedState(name));
        }
      })
      .on('set', (value, callback) => {
        //Switching colors will trigger both hue and saturation to avoid the color command being sent repeatedly. 
        //So the saturation is saved and is sent with the hue
        if (name == Characteristic.Saturation) {
          this.setCachedState(name, value);
          callback();
          return;
        }
        var param = this.getSendParam(name, value)
        console.log("LightAccessory getCharacteristic set name.", name);
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
    switch (name) {
      case Characteristic.On:
        const isOn = value ? true : false;
        code = "switch_led";
        value = isOn;
        break;
      case Characteristic.ColorTemperature:
        var temperature;
        temperature = Math.floor((value - 140) * (temp_range.max - temp_range.min) / 360 + temp_range.min); // value 140~500
        code = this.tempValue.code;
        value = temperature;
        break;
      case Characteristic.Brightness:
        {
          var percentage;
          var saturation;
          percentage = Math.floor((bright_range.max - bright_range.min) * value / 100  + bright_range.min); //  value 0~100
          saturation = Math.floor((saturation_range.max - saturation_range.min) * this.getCachedState(Characteristic.Saturation) / 100  + saturation_range.min); // value 0~100
          if (this.workMode.value == 'white') {
            code = this.brightValue.code;
            value = percentage;
          } else {
            var hue = this.getCachedState(Characteristic.Hue);; // 0-359
            code = this.colourData.code;
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
        bright = Math.floor((bright_range.max - bright_range.min) * this.getCachedState(Characteristic.Brightness) / 100  + bright_range.min); //  value 0~100
        saturation = Math.floor((bright_range.max - bright_range.min) * this.getCachedState(Characteristic.Saturation) / 100  + bright_range.min);// value 0~100
        code = this.colourData.code;
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


  getFunction(code){
    var funcDic = this.functionArr.find((item, index) => {return item.code == code })
    let valueRange = JSON.parse(funcDic.values)
    if(JSON.stringify(valueRange) != "{}"){
      if(code == 'colour_data' || code == 'colour_data_v2'){
        return {'min': parseInt(valueRange.s.min), 'max': parseInt(valueRange.s.max)};
      }
      return {'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max)};
    }else{
      return {'min': 0, 'max': 255};
    }
  }

  //update device status
  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
    console.log("LightAccessory updateState devices", data);
  }
}

module.exports = LightAccessory;