const BaseAccessory = require('./base_accessory')

let PlatformAccessory;
let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class OutletAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);

    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.OUTLET
    )

    this.isRefesh = false;
    this.statusArr = deviceConfig.status;

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefesh) {
    this.isRefesh = isRefesh;
    for (var statusMap of statusArr) {
      if (statusMap.code === 'switch') {
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
    }
  }

  getAccessoryCharacteristic(name) {
    this.service.getCharacteristic(name)
      .on('get', callback => {
        // Retrieve state from cache
        if (this.hasValidCache()) {
          console.log("Hanh PluginTest getCharacteristic get.", this.getCachedState(name));
          callback(null, this.getCachedState(name));
        }
      })
      .on('set', (value, callback) => {
        var param = this.getSendParam(name, value)
        console.log("Hanh PluginTest getCharacteristic set name and param.", name, param);
        this.platform.tuyaOpenApi.sendCommand(this.deviceId, param).then(() => {
          this.setCachedState(name, value);
          callback(null, value);
        }).catch((error) => {
          this.log.error('[SET][%s] Characteristic.Brightness Error: %s', this.homebridgeAccessory.displayName, error);
          this.invalidateCache();
          callback(error);
        });
      });
  }

  getSendParam(name, value) {
    var code;
    var value;
    switch (name) {
      case Characteristic.On:
        const isOn = value ? true : false;
        code = "switch";
        value = isOn;
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

  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
    console.log("Hanh Refreshing updateState devices", data);
  }
}

module.exports = OutletAccessory;