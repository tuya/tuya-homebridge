const BaseAccessory = require('./base_accessory')

let PlatformAccessory;
let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class OutletAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig, deviceData) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);

    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.OUTLET,
      Service.Outlet,
      deviceData.subType
    )

    this.isRefesh = false;
    this.statusArr = deviceConfig.status;
    this.subTypeArr = deviceData.subType;
    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefesh) {
    this.isRefesh = isRefesh;
    if (!statusArr) {
      return;
    }

    for (var subType of this.subTypeArr) {
      var status = statusArr.find(item => item.code === subType)
      if (!status) {
        continue;
      }
      var value = status.value
      const service = this.homebridgeAccessory.getService(subType);
      this.setCachedState(service.displayName, value);
      if (this.isRefesh) {
        service
          .getCharacteristic(Characteristic.On)
          .updateValue(value);
      } else {
        this.getAccessoryCharacteristic(service, Characteristic.On);
      }
    }
  }

  

  getAccessoryCharacteristic(service, name) {
    //set  Accessory service Characteristic
    service.getCharacteristic(name)
      .on('get', callback => {
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(service.displayName));
        }
      })
      .on('set', (value, callback) => {
        var param = this.getSendParam(service.displayName, value)
        this.platform.tuyaOpenApi.sendCommand(this.deviceId, param).then(() => {
          this.setCachedState(service.displayName, value);
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
    const isOn = value ? true : false;
    code = name;
    value = isOn;
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
  }
}

module.exports = OutletAccessory;