const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class GarageDoorAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.GARAGE_DOOR_OPENER,
      Service.GarageDoorOpener
    );
    this.statusArr = deviceConfig.status;

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh;
    for (var statusMap of statusArr) {
      var rawStatus = statusMap.value
      let characteristicName
      let value
      switch (statusMap.code) {
        case 'switch_1':
          if (rawStatus) {
            value = '0'
          } else {
            value = '1'
          }
          characteristicName = Characteristic.TargetDoorState
          this.initAccessoryCharacteristic(characteristicName, value)
          break;
        case 'doorcontact_state':
          if (rawStatus) {
            value = '0'
          } else {
            value = '1'
          }
          characteristicName = Characteristic.CurrentDoorState
          this.initAccessoryCharacteristic(characteristicName, value)
          break;
        case 'countdown_alarm':
          value = false
          characteristicName = Characteristic.ObstructionDetected
          this.initAccessoryCharacteristic(characteristicName, value)
          break;
        default:
          break;
      }
    }
  }

  initAccessoryCharacteristic(characteristicName,value){
    this.setCachedState(characteristicName, value);
    if (this.isRefresh) {
      this.service
        .getCharacteristic(characteristicName)
        .updateValue(value);
    } else {
      this.getAccessoryCharacteristic(characteristicName);
    }
  }

  getAccessoryCharacteristic(name) {
    //set  Accessory service Characteristic
    this.service.getCharacteristic(name)
      .on('get', callback => {
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(name));
        }
      })
      .on('set', (value, callback) => {
        var param = this.getSendParam(name, value)
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
      case Characteristic.TargetDoorState:
        const isOn = value == '1' ? false : true;
        code = "switch_1";
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

  //update device status
  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }
}

module.exports = GarageDoorAccessory;