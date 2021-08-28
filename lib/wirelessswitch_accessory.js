const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class WirelessSwitchAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig, deviceData) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.SWITCH,
      Service.StatelessProgrammableSwitch,
      deviceData.subType
    );
    this.statusArr = deviceConfig.status;

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh
    this.log.log(statusArr)
    for (var statusMap of statusArr) {
      this.sensorStatus = statusMap
      var rawStatus = this.sensorStatus.value
      let status
      switch (rawStatus) {
        case 'single_click':
        case 'click':
          status = 0
          break;
        case 'double_click':
          status = 1
          break;
        case 'long_press':
        case 'press':
          status = 2
          break;
        default:
          break;
      }
      const service = this.homebridgeAccessory.getService(statusMap.code);
      this.setCachedState(Characteristic.ProgrammableSwitchEvent, status);
      if (this.isRefresh) {
        service
          .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
          .setValue(status);
      } else {
        this.getAccessoryCharacteristic(service, Characteristic.ProgrammableSwitchEvent);
      }
    }
  }

  getAccessoryCharacteristic(service, name) {
    //set  Accessory service Characteristic
    service.getCharacteristic(name)
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

module.exports = WirelessSwitchAccessory;