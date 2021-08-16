const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class SmokeSensorAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.SENSOR,
      Service.SmokeSensor
    );
    this.statusArr = deviceConfig.status;

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh
    for (var statusMap of statusArr) {
      if (statusMap.code === 'smoke_sensor_status') {
        this.sensorStatus = statusMap
        var rawStatus = this.sensorStatus.value
        let status
        switch (rawStatus) {
          case 'alarm':
            status = '1'
            break;
          case 'normal':
            status = '0'
            break;
          default:
            break;
        }
        this.setCachedState(Characteristic.SmokeDetected, status);
        if (this.isRefresh) {
          this.service
            .getCharacteristic(Characteristic.SmokeDetected)
            .updateValue(status);
        } else {
          this.getAccessoryCharacteristic(Characteristic.SmokeDetected);
        }
      }

      if (statusMap.code === 'battery_state') {
        this.batteryStatus = statusMap
        var rawStatus = this.batteryStatus.value
        let status
        switch (rawStatus) {
          case 'low':
            status = '1'
            break;
          case 'middle':
          case 'high':
            status = '0'
            break;
          default:
            break;
        }
        this.setCachedState(Characteristic.StatusLowBattery, status);
        if (this.isRefresh) {
          this.service
            .getCharacteristic(Characteristic.StatusLowBattery)
            .updateValue(status);
        } else {
          this.getAccessoryCharacteristic(Characteristic.StatusLowBattery);
        }
      }
    }
  }

  getAccessoryCharacteristic(name) {
    //set  Accessory service Characteristic
    this.service.getCharacteristic(name)
      .on('get', callback => {
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(name));
        }
      });
  }

  //update device status
  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }
}

module.exports = SmokeSensorAccessory;