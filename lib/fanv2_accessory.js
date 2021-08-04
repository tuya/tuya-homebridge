const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

const DEFAULT_SPEED_COUNT = 3;
class Fanv2Accessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {

    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.FAN,
      Service.Fanv2
    );
    this.isRefresh = false;
    this.statusArr = deviceConfig.status ? deviceConfig.status : [];
    this.functionArr = deviceConfig.functions ? deviceConfig.functions : [];

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh
    for (const statusMap of statusArr) {
      if (statusMap.code === 'switch' || statusMap.code === 'fan_switch' || statusMap.code === 'switch_fan') {
        this.switchMap = statusMap
        const hbSwitch = this.tuyaParamToHomeBridge(Characteristic.Active, this.switchMap.value);
        this.normalAsync(Characteristic.Active, hbSwitch, this.isRefresh)
      }
      if (statusMap.code === 'mode') {
        this.modeMap = statusMap
        const hbFanState = this.tuyaParamToHomeBridge(Characteristic.TargetFanState, this.modeMap.value);
        this.normalAsync(Characteristic.TargetFanState, hbFanState, this.isRefresh)

      }
      if (statusMap.code === 'child_lock') {
        this.lockMap = statusMap
        const hbLock = this.tuyaParamToHomeBridge(Characteristic.LockPhysicalControls, this.lockMap.value);
        this.normalAsync(Characteristic.LockPhysicalControls, hbLock, this.isRefresh)
      }

      if (statusMap.code === 'fan_direction') {
        this.directionMap = statusMap
        const hbDirection = this.tuyaParamToHomeBridge(Characteristic.RotationDirection, this.directionMap.value);
        this.normalAsync(Characteristic.RotationDirection, hbDirection, this.isRefresh)
      }

      if (statusMap.code === 'fan_speed_percent') {
        this.speedMap = statusMap
        this.speed_range = this.getSpeedFunctionRange(this.speedMap.code)
        const rawValue = this.speedMap.value // 1~12
        const value = Math.floor((rawValue * 100 - 100 * this.speed_range.min) / (this.speed_range.max - this.speed_range.min));  // 0-100
        this.normalAsync(Characteristic.RotationSpeed, value, this.isRefresh)
      }

      if (statusMap.code === 'fan_speed') {
        this.speedMap = statusMap;
        if ((typeof this.speedMap.value == 'string') && this.speedMap.value.constructor == String) {
          //get speed level dp range
          this.speed_count = this.getSpeedFunctionLevel(this.speedMap.code)
          this.speed_coefficient = 100 / this.speed_count
          const hbSpeed = parseInt(this.speedMap.value * this.speed_coefficient);
          this.normalAsync(Characteristic.RotationSpeed, hbSpeed, this.isRefresh)
        }else{
          this.speed_range = this.getSpeedFunctionRange(this.speedMap.code)
          const rawValue = this.speedMap.value // 1~12
          const value = Math.floor((rawValue * 100 - 100 * this.speed_range.min) / (this.speed_range.max - this.speed_range.min));  // 0-100
          this.normalAsync(Characteristic.RotationSpeed, value, this.isRefresh)
        }
      }

      if (statusMap.code === 'switch_vertical') {
        this.swingMap = statusMap
        const hbSwing = this.tuyaParamToHomeBridge(Characteristic.SwingMode, this.swingMap.value);
        this.normalAsync(Characteristic.SwingMode, hbSwing, this.isRefresh)
      }
    }
  }

  normalAsync(name, hbValue, isRefresh) {
    this.setCachedState(name, hbValue);
    if (isRefresh) {
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
      }).on('set', (value, callback) => {
        const param = this.getSendParam(name, value)
        this.platform.tuyaOpenApi.sendCommand(this.deviceId, param).then(() => {
          this.setCachedState(name, value);
          callback();
        }).catch((error) => {
          this.log.error('[SET][%s] Characteristic Error: %s', this.homebridgeAccessory.displayName, error);
          this.invalidateCache();
          callback(error);
        });
      });
  }

  getSendParam(name, hbValue) {
    var code;
    var value;
    switch (name) {
      case Characteristic.Active:
        value = hbValue == 1 ? true : false;
        const isOn = value;
        code = this.switchMap.code;
        value = isOn;
        break;
      case Characteristic.TargetFanState:
        value = hbValue == 1 ? "smart" : "nature";
        const mode = value;
        code = "mode";
        value = mode;
        break;
      case Characteristic.LockPhysicalControls:
        value = hbValue == 1 ? true : false;
        const isLock = value;
        code = "child_lock";
        value = isLock;
        break;
      case Characteristic.RotationDirection:
        value = hbValue == 0 ? "forward" : "reverse";
        const direction = value;
        code = "fan_direction";
        value = direction;
        break;
      case Characteristic.RotationSpeed:
        let speed
        if ((typeof this.speedMap.value == 'string') && this.speedMap.value.constructor == String) {
          let level = Math.floor(hbValue / this.speed_coefficient) + 1
          level = level > this.speed_count ? this.speed_count : level;
          speed = "" + level;
        }else{
          speed = Math.floor((hbValue * this.speed_range.max - hbValue * this.speed_range.min + 100 * this.speed_range.min) / 100);  //1~100
        }
        code = this.speedMap.code;
        value = speed;
        break;
      case Characteristic.SwingMode:
        value = hbValue == 1 ? true : false;
        const isSwing = value;
        code = "switch_vertical";
        value = isSwing;
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


  tuyaParamToHomeBridge(name, param) {
    switch (name) {
      case Characteristic.Active:
      case Characteristic.LockPhysicalControls:
      case Characteristic.SwingMode:
        let status
        if (param) {
          status = 1
        } else {
          status = 0
        }
        return status
      case Characteristic.TargetFanState:
        let value
        if (param === 'smart') {
          value = 1
        } else {
          value = 0
        }
        return value
      case Characteristic.RotationDirection:
        let direction
        if (param === "forward") {
          direction = 0
        } else {
          direction = 1
        }
        return direction
    }
  }

  getSpeedFunctionRange(code) {
    if (this.functionArr.length == 0) {
      return { 'min': 1, 'max': 100 };
    }
    var funcDic = this.functionArr.find((item, index) => { return item.code == code })
    if (funcDic) {
      let valueRange = JSON.parse(funcDic.values)
      let isnull = (JSON.stringify(valueRange) == "{}")
      return isnull ? { 'min': 1, 'max': 100 } : { 'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max) };
    } else {
      return { 'min': 1, 'max': 100 };
    }
  }

  getSpeedFunctionLevel(code) {
    if (this.functionArr.length == 0) {
      return DEFAULT_SPEED_COUNT;
    }
    var funcDic = this.functionArr.find((item, index) => { return item.code == code })
    if (funcDic) {
      let value = JSON.parse(funcDic.values)
      let isnull = (JSON.stringify(value) == "{}")
      return isnull ? DEFAULT_SPEED_COUNT : value.range.length;
    } else {
      return DEFAULT_SPEED_COUNT;
    }
  }

  //update device status
  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }
}

module.exports = Fanv2Accessory;
