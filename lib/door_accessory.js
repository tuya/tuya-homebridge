const BaseAccessory = require("./base_accessory");

let Accessory;
let Service;
let Characteristic;

class DoorAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {
    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.Door,
      Service.Door
    );
    this.statusArr = deviceConfig.status;

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
    this.getAccessoryCharacteristic(Characteristic.TargetPosition);
  }

  /**
   * init Or refresh AccessoryService
   */
  refreshAccessoryServiceIfNeed(stateArr, isRefresh) {
    this.isRefresh = isRefresh;
    for (const statusMap of stateArr) {
      if (statusMap.code === "percent_control") {
        this.normalAsync(Characteristic.TargetPosition, statusMap.value);
        this.currentTarget = statusMap.value;
      }

      if (statusMap.code === "percent_state") {
        this.normalAsync(Characteristic.TargetPosition, statusMap.value);
        this.normalAsync(Characteristic.CurrentPosition, statusMap.value);
        this.currentTarget = undefined;
      }

      if (statusMap.code === "control") {
        if (!this.currentTarget) {
          switch (statusMap.value) {
            case "close":
              this.normalAsync(Characteristic.TargetPosition, 0);
              break;
            case "open":
              this.normalAsync(Characteristic.TargetPosition, 100);
              break;
          }
        }
      }
    }
  }

  /**
   * add get/set Accessory service Characteristic Listner
   */
  getAccessoryCharacteristic(name, props) {
    //set  Accessory service Characteristic
    this.service
      .getCharacteristic(name)
      .setProps(props || {})
      .on("get", (callback) => {
        if (this.hasValidCache()) {
          callback(null, this.getCachedState(name));
        }
      })
      .on("set", (hbValue, callback) => {
        let tuyaParam = this.getTuyaParam(name, hbValue);
        this.platform.tuyaOpenApi
          .sendCommand(this.deviceId, tuyaParam)
          .then(() => {
            this.setCachedState(name, hbValue);
            callback();
          })
          .catch((error) => {
            this.log.error(
              "[SET][%s] Characteristic Error: %s",
              this.homebridgeAccessory.displayName,
              error
            );
            this.invalidateCache();
            callback(error);
          });
      });
  }

  /**
   * get Tuya param from HomeBridge param
   */
  getTuyaParam(name, hbParam) {
    let code;
    let value;
    if (Characteristic.TargetPosition === name) {
      code = "percent_control";
      value = hbParam;
    }
    return {
      commands: [
        {
          code: code,
          value: value,
        },
      ],
    };
  }

  /**
   * update HomeBridge state
   * @param {*} name HomeBridge Name
   * @param {*} hbValue HomeBridge Value
   */
  normalAsync(name, hbValue) {
    this.setCachedState(name, hbValue);
    this.service.getCharacteristic(name).updateValue(hbValue);
  }

  /**
   * Tuya MQTT update device status
   */
  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }
}

module.exports = DoorAccessory;
