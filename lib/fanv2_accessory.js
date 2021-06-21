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

    if (this.functionArr.length != 0) {
      this.speed_range = this.getSpeedFunctionRange('fan_speed_percent')
    } else {
      this.speed_range = { 'min': 1, 'max': 100 }
    }

    if (this.functionArr.length != 0) {
      this.speed_count = this.getSpeedFunctionLevel("fan_speed")
    } else {
      this.speed_count = DEFAULT_SPEED_COUNT
    }
    this.speed_coefficient = 100 / this.speed_count

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh
    for (var statusMap of statusArr) {
      if (statusMap.code === 'switch') {
        this.switchMap = statusMap
        var rawStatus = this.switchMap.value
        let status
        if (rawStatus) {
          status = '1'
        } else {
          status = '0'
        }
        this.normalAsync(Characteristic.Active, status, this.isRefresh)
      }
      if (statusMap.code === 'mode') {
        this.modeMap = statusMap
        var rawValue = this.modeMap.value
        let value
        switch (rawValue) {
          case 'smart':
            value = '1'
            break;
          default:
            value = '0'
            break;
        }
        this.normalAsync(Characteristic.TargetFanState, value, this.isRefresh)

      }
      if (statusMap.code === 'child_lock') {
        this.lockMap = statusMap
        var rawValue = this.lockMap.value
        let value
        if (rawStatus) {
          value = '1'
        } else {
          value = '0'
        }
        this.normalAsync(Characteristic.LockPhysicalControls, value, this.isRefresh)
      }

      if (statusMap.code === 'fan_direction') {
        this.directionMap = statusMap
        var rawValue = this.directionMap.value
        let value
        if (rawStatus == "forward") {
          value = 0
        } else {
          value = 1
        }
        this.normalAsync(Characteristic.RotationDirection, value, this.isRefresh)
      }

      if (statusMap.code === 'fan_speed_percent') {
        this.speedMap = statusMap
        var rawValue = this.speedMap.value // 1~12
        let value
        value = Math.floor((rawValue * 100 - 100 * this.speed_range.min) / (this.speed_range.max - this.speed_range.min));  // 0-100
        this.normalAsync(Characteristic.RotationSpeed, value, this.isRefresh)
      }

      if (statusMap.code === 'fan_speed') {
        this.speedMap = statusMap;
        const hbSpeed = parseInt(this.speedMap.value * this.speed_coefficient);
        this.normalAsync(Characteristic.RotationSpeed, hbSpeed, this.isRefresh)
      }

      if (statusMap.code === 'switch_vertical') {
        this.swingMap = statusMap
        var rawStatus = this.swingMap.value
        let value
        if (rawStatus) {
          value = '1'
        } else {
          value = '0'
        }
        this.normalAsync(Characteristic.SwingMode, value, this.isRefresh)
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

  getSendParam(name, value) {
    var code;
    var value;
    switch (name) {
      case Characteristic.Active:
        if (value == "1") {
          value = true
        } else {
          value = false
        }
        const isOn = value;
        code = "switch";
        value = isOn;
        break;
      case Characteristic.TargetFanState:
        if (value == "1") {
          value = "smart"
        } else {
          value = "nature"
        }
        const mode = value;
        code = "mode";
        value = mode;
        break;
      case Characteristic.LockPhysicalControls:
        if (value == "1") {
          value = true
        } else {
          value = false
        }
        const isLock = value;
        code = "child_lock";
        value = isLock;
        break;
      case Characteristic.RotationDirection:
        if (value == 0) {
          value = "forward"
        } else {
          value = "reverse"
        }
        const direction = value;
        code = "fan_direction";
        value = direction;
        break;
      case Characteristic.RotationSpeed:
        let speed
        if (this.speedMap.code === 'fan_speed_percent') {
          speed = Math.floor((value * this.speed_range.max - value * this.speed_range.min + 100 * this.speed_range.min) / 100);  //1~100
        } else {
          let level = Math.floor(value / this.speed_coefficient) + 1
          level = level > this.speed_count ? this.speed_count : level;
          speed = level;
        }
        code = this.speedMap.code;
        value = speed;
        break;
      case Characteristic.SwingMode:
        if (value == "1") {
          value = true
        } else {
          value = false
        }
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

  getSpeedFunctionRange(code) {
    var funcDic = this.functionArr.find((item, index) => { return item.code == code })
    if (funcDic) {
      let valueRange = JSON.parse(funcDic.values)
      let isnull = (JSON.stringify(valueRange) == "{}")
      return isnull ? { 'min': 1, 'max': 100 } : { 'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max) };
    } else {
      return { 'min': 1, 'max': 100 }
    }
  }

  getSpeedFunctionLevel(code) {
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
