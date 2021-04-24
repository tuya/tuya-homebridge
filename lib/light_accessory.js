const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class LightAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.LIGHTBULB
    );
    this.isRefesh = false;
    this.statusArr = deviceConfig.status;

    console.log("Hanh PluginTest this.statusArr.", this.statusArr);

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
        if(this.isRefesh){
          this.service
          .getCharacteristic(Characteristic.On)
          .updateValue(this.switchLed.value);
        }else{
          this.getAccessoryCharacteristic(Characteristic.On);
        }
      }
      if (statusMap.code === 'bright_value') {
        this.brightValue = statusMap;
        var rawValue;
        var percentage;
        rawValue = this.brightValue.value; //25~255
        percentage = Math.floor((rawValue * 100 - 2500) / 230);  // 0-100 
        this.setCachedState(Characteristic.Brightness, percentage);
        if(this.isRefesh){
          this.service
          .getCharacteristic(Characteristic.Brightness)
          .updateValue(percentage);
        }else{
          this.getAccessoryCharacteristic(Characteristic.Brightness);
        }
      }
      if (statusMap.code === 'temp_value') {
        this.tempValue = statusMap;
        var rawValue;
        var temperature;
        rawValue = this.tempValue.value;
        temperature = Math.floor((rawValue * 360 + 23200) / 230);
        this.setCachedState(Characteristic.ColorTemperature, temperature);
        if(this.isRefesh){
          this.service
          .getCharacteristic(Characteristic.ColorTemperature)
          .updateValue(temperature);
        }else{
          this.getAccessoryCharacteristic(Characteristic.ColorTemperature);
        }
      }
      if (statusMap.code === 'colour_data') {
        this.colourData = statusMap;
        this.colourObj = JSON.parse(this.colourData.value)

        const hue = this.colourObj.h; // 0-359
        this.setCachedState(Characteristic.Hue, hue);
        const saturation = Math.floor(this.colourObj.s / 255 * 100); // 0-100
        this.setCachedState(Characteristic.Saturation, saturation);

        if(this.isRefesh){
          this.service
          .getCharacteristic(Characteristic.Hue)
          .updateValue(hue);
        }else{
          this.getAccessoryCharacteristic(Characteristic.Hue);
        }

        if(this.isRefesh){
          this.service
          .getCharacteristic(Characteristic.Saturation)
          .updateValue(saturation);
        }else{
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
          console.log("Hanh PluginTest getCharacteristic get.", this.getCachedState(name));
          callback(null, this.getCachedState(name));
        }
      })
      .on('set', (value, callback) => {
        //Switching colors will trigger both hue and saturation to avoid the color command being sent repeatedly. 
        //So the saturation is saved and is sent with the hue
        if(name == Characteristic.Saturation){
          this.setCachedState(name, value);
          callback();
          return;
        }
        var param = this.getSendParam(name, value)
        console.log("Hanh PluginTest getCharacteristic set name.", name);
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
        temperature = Math.floor((value * 230 - 23200) / 360);
        code = "temp_value";
        value = temperature;
        break;
      case Characteristic.Brightness:
        {
          if(this.workMode.value == 'white'){
            var percentage;
            percentage = Math.floor((value * 230 + 2500) / 100);  //25~255
            code = "bright_value";
            value = percentage;
          }else{
            var percentage;
            percentage = Math.floor((value * 230 + 2500) / 100);  //25~255
            var hue = this.getCachedState(Characteristic.Hue);; // 0-359
            var saturation = Math.floor(this.getCachedState(Characteristic.Saturation) / 100 * 255); // 0-255
            code = "colour_data";
            value = {
              "h": hue,
              "s": saturation,
              "v": percentage
            };
          }
        }
        break;
      case Characteristic.Hue:
        var bright = Math.floor(this.getCachedState(Characteristic.Brightness) / 100 * 255);  // 0-255
        var saturation = Math.floor(this.getCachedState(Characteristic.Saturation) / 100 * 255); // 0-255
        code = "colour_data";
        value = {
          "h": value,
          "s": saturation,
          "v": bright
        };
        break;
      // case Characteristic.Saturation:
      //   var brightness = Math.floor(this.getCachedState(Characteristic.Brightness) / 100 * 255); // 0-255
      //   var satu = Math.floor(value / 100 * 255)  // 0-255
      //   var hue = this.getCachedState(Characteristic.Hue);; // 0-359
      //   code = "colour_data";
      //   value = {
      //     "h": hue,
      //     "s": satu,
      //     "v": brightness
      //   };
      //   break;
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

  //update device status
  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
    console.log("Hanh Refreshing updateState devices", data);
  }
}

module.exports = LightAccessory;