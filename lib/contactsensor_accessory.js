const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class ContactSensorAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.SENSOR,
      Service.ContactSensor
    );

    this.statusArr = deviceConfig.status;
    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh;
    for (var statusMap of statusArr) {
      if (statusMap.code === 'doorcontact_state') {
        this.sensorStatus = statusMap
        const hbSensorState = this.tuyaParamToHomeBridge(Characteristic.ContactSensorState, this.sensorStatus.value);
        this.normalAsync(Characteristic.ContactSensorState, hbSensorState)
      }

      if (statusMap.code === 'battery_percentage') {
        this.batteryStatus = statusMap
        const hbBatteryStatus = this.tuyaParamToHomeBridge(Characteristic.StatusLowBattery, this.batteryStatus.value);
        this.normalAsync(Characteristic.StatusLowBattery, hbBatteryStatus)
      }
    }
  }

  tuyaParamToHomeBridge(name, param) {
    switch (name) {
      case Characteristic.ContactSensorState:
        let status
        if (param === true) {
          status = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
        } else {
          status = Characteristic.ContactSensorState.CONTACT_DETECTED
        }
        return status

      case Characteristic.StatusLowBattery:
        let value
        if (param >= 20) {
          value = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        } else {
          value = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
        }
        return value
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

module.exports = ContactSensorAccessory;