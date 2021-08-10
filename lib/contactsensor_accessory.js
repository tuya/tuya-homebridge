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
    this.isRefresh = false;
    this.statusArr = deviceConfig.status;

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh;

    for (var statusMap of statusArr) {
      if (statusMap.code === 'doorcontact_state') {
        this.sensorStatus = statusMap
        var rawStatus = this.sensorStatus.value
        let status

        if (rawStatus === true) {
            status = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
        } else {
            status = Characteristic.ContactSensorState.CONTACT_DETECTED
        }
        this.setCachedState(Characteristic.ContactSensorState, status);
        if (this.isRefresh) {
          this.service
            .getCharacteristic(Characteristic.ContactSensorState)
            .updateValue(status);
        } else {
          this.getAccessoryCharacteristic(Characteristic.ContactSensorState);
        }
      }

      if (statusMap.code === 'battery_percentage') {
        this.batteryStatus = statusMap
        var rawStatus = this.batteryStatus.value
        let status

        if (rawStatus >= 20) {
            status = '0';
        } else {
            status = '1';            
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

module.exports = ContactSensorAccessory;