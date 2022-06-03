const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class HumanPresenceSensorAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.SENSOR,
      Service.OccupancySensor
    );

    this.statusArr = deviceConfig.status;
    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh;
    for (var statusMap of statusArr) {
      if (statusMap.code === 'presence_state') {

        this.sensorStatus = statusMap
        const hbSensorState = this.tuyaParamToHomeBridge(Characteristic.OccupancyDetected, this.sensorStatus.value);
        this.normalAsync(Characteristic.OccupancyDetected, hbSensorState)
      }
    }
  }

  tuyaParamToHomeBridge(name, param) {
    switch (name) {
      case Characteristic.OccupancyDetected:
        let status
        if (param === "presence") {
          status = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
        } else {
          status = Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED
        }
        return status
    }
  }


  normalAsync(name, hbValue) {
    this.setCachedState(name, hbValue);
    if (this.isRefresh) {
      this.service
        .getCharacteristic(name)
        .updateValue(hbValue);
    } else {
      this.getAccessoryCharacteristic(name);
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

module.exports = HumanPresenceSensorAccessory;