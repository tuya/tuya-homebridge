const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;

const DEFAULT_SPEED_RANGE = {'min': 1, 'max': 100};
const DEFAULT_SPEED_LEVELS = ['1', '2', '3'];
const DEFAULT_BRIGHTNESS_RANGE = {'min': 10, 'max': 1000};

class Fanv2Accessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {
    ({Accessory, Characteristic, Service} = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.FAN,
      Service.Fanv2
    );
    this.statusArr = deviceConfig.status ? deviceConfig.status : [];
    this.functionArr = deviceConfig.functions ? deviceConfig.functions : [];
    //support fan light
    this.addLightService();
    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //addLightService function
  addLightService() {
    this.lightStatus = this.statusArr.find((item) => { return item.code === 'light' && typeof item.value === 'boolean' });
    if (this.lightStatus) {
      // Service
      this.lightService = this.homebridgeAccessory.getService(Service.Lightbulb);
      if (this.lightService) {
        this.lightService.setCharacteristic(Characteristic.Name, this.deviceConfig.name + ' Light');
      }
      else {
        // add new service
        this.lightService = this.homebridgeAccessory.addService(Service.Lightbulb, this.deviceConfig.name + ' Light');
      }
    }
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh
    let speedStatusDetected = false;
    for (const statusMap of statusArr) {
      if (statusMap.code === 'switch' || statusMap.code === 'fan_switch' || statusMap.code === 'switch_fan') {
        this.switchMap = statusMap
        const hbSwitch = this.tuyaParamToHomeBridge(Characteristic.Active, this.switchMap.value);
        this.normalAsync(Characteristic.Active, hbSwitch)
      }
      if (statusMap.code === 'mode') {
        this.modeMap = statusMap
        const hbFanState = this.tuyaParamToHomeBridge(Characteristic.TargetFanState, this.modeMap.value);
        this.normalAsync(Characteristic.TargetFanState, hbFanState)

      }
      if (statusMap.code === 'child_lock') {
        this.lockMap = statusMap
        const hbLock = this.tuyaParamToHomeBridge(Characteristic.LockPhysicalControls, this.lockMap.value);
        this.normalAsync(Characteristic.LockPhysicalControls, hbLock)
      }

      if (statusMap.code === 'fan_direction') {
        this.directionMap = statusMap
        const hbDirection = this.tuyaParamToHomeBridge(Characteristic.RotationDirection, this.directionMap.value);
        this.normalAsync(Characteristic.RotationDirection, hbDirection)
      }

      if (!speedStatusDetected && ['fan_speed_enum', 'fan_speed', 'fan_speed_percent'].includes(statusMap.code)) {
        speedStatusDetected = true;
        this.speedMap = statusMap;
        const funcDic = this.getDpFunction(this.speedMap.code);
        if (funcDic.type === 'Enum') {
          //get speed levels
          this.speed_levels = this.getSpeedFunctionLevels(this.speedMap.code)
          this.speed_coefficient = 100 / this.speed_levels.length;
          const levelIndex = this.speed_levels.findIndex(level => level === this.speedMap.value) + 1;
          const hbSpeed = Math.floor((levelIndex > 0 ? levelIndex : this.speed_levels.length) * this.speed_coefficient);
          this.normalAsync(Characteristic.RotationSpeed, hbSpeed)
        } else if (funcDic.type === 'Integer') {
          this.speed_range = this.getSpeedFunctionRange(this.speedMap.code)
          const rawValue = this.speedMap.value >= this.speed_range.min && this.speedMap.value <= this.speed_range.max
            ? this.speedMap.value : this.speed_range.max;
          const value = Math.floor((rawValue * 100 - 100 * this.speed_range.min) / (this.speed_range.max - this.speed_range.min)); // 0-100
          this.normalAsync(Characteristic.RotationSpeed, value)
        }
      }

      if (statusMap.code === 'switch_vertical') {
        this.swingMap = statusMap
        const hbSwing = this.tuyaParamToHomeBridge(Characteristic.SwingMode, this.swingMap.value);
        this.normalAsync(Characteristic.SwingMode, hbSwing)
      }

      if (this.lightService && statusMap.code === 'light') {
        this.switchLed = statusMap;
        const hbLight = this.tuyaParamToHomeBridge(Characteristic.On, this.switchLed.value);
        this.normalAsync(Characteristic.On, hbLight, this.lightService)
      }

      if (this.lightService && statusMap.code === 'bright_value') {
        this.brightValue = statusMap;
        this.bright_range = this.getBrightnessFunctionRange(this.brightValue.code)
        const rawValue = this.brightValue.value;
        const percentage = Math.floor((rawValue - this.bright_range.min) * 100 / (this.bright_range.max - this.bright_range.min)); //    $
        this.normalAsync(Characteristic.Brightness, percentage > 100 ? 100 : percentage, this.lightService)
      }
    }
  }

  normalAsync(name, hbValue, service = null) {
    this.setCachedState(name, hbValue);
    if (this.isRefresh) {
      (service ? service : this.service)
        .getCharacteristic(name)
        .updateValue(hbValue);
    } else {
      this.getAccessoryCharacteristic(name, service);
    }
  }

  getAccessoryCharacteristic(name, service = null) {
    //set  Accessory service Characteristic
    (service ? service : this.service).getCharacteristic(name)
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
        value = !!hbValue;
        const isOn = value;
        code = this.switchMap.code;
        value = isOn;
        break;
      case Characteristic.TargetFanState:
        value = !!hbValue ? "smart" : "nature";
        const mode = value;
        code = "mode";
        value = mode;
        break;
      case Characteristic.LockPhysicalControls:
        value = !!hbValue;
        const isLock = value;
        code = "child_lock";
        value = isLock;
        break;
      case Characteristic.RotationDirection:
        value = !hbValue ? "forward" : "reverse";
        const direction = value;
        code = "fan_direction";
        value = direction;
        break;
      case Characteristic.RotationSpeed:
        let speed
        const funcDic = this.getDpFunction(this.speedMap.code);
        if (funcDic.type === 'Enum' && this.speed_levels) {
          let levelIndex = Math.floor(hbValue / this.speed_coefficient) - 1;
          levelIndex = levelIndex >= 0 && levelIndex < this.speed_levels.length ? levelIndex : this.speed_levels.length - 1;
          speed = "" + this.speed_levels[levelIndex];
        } else if (funcDic.type === 'Integer' && this.speed_range) {
          speed = Math.floor((hbValue * this.speed_range.max - hbValue * this.speed_range.min + 100 * this.speed_range.min) / 100);  //1~100
        }
        code = this.speedMap.code;
        value = speed;
        break;
      case Characteristic.SwingMode:
        value = !!hbValue;
        const isSwing = value;
        code = "switch_vertical";
        value = isSwing;
        break;
      case Characteristic.On:
        code = this.switchLed.code;
        value = !!hbValue;
        break;
      case Characteristic.Brightness:
        value = Math.floor((this.bright_range.max - this.bright_range.min) * hbValue / 100 + this.bright_range.min); //  value 0~100
        code = this.brightValue.code;
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
      case Characteristic.On:
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

  /**
   * @param {string} code
   * @return {{}}
   */
  getDpFunction(code) {
    if (this.functionArr.length === 0) {
      return {};
    }
    return this.functionArr.find((item) => {
      return item.code === code
    })
  }

  /**
   * @param {string} code
   * @return {{min: number, max: number}}
   */
  getSpeedFunctionRange(code) {
    const funcDic = this.getDpFunction(code);
    if (!funcDic.code) {
      return DEFAULT_SPEED_RANGE;
    }
    if (funcDic) {
      let valueRange = JSON.parse(funcDic.values)
      let isnull = (JSON.stringify(valueRange) === "{}")
      return isnull || valueRange.min === undefined || valueRange.max === undefined ?
        DEFAULT_SPEED_RANGE : {'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max)};
    } else {
      return DEFAULT_SPEED_RANGE;
    }
  }

  /**
   * @param {string} code
   * @return {string[]}
   */
  getSpeedFunctionLevels(code) {
    const funcDic = this.getDpFunction(code);
    if (!funcDic.code) {
      return DEFAULT_SPEED_LEVELS;
    }
    if (funcDic) {
      let value = JSON.parse(funcDic.values)
      let isnull = (JSON.stringify(value) === "{}")
      return isnull || !value.range || !Array.isArray(value.range) ? DEFAULT_SPEED_LEVELS : value.range;
    } else {
      return DEFAULT_SPEED_LEVELS;
    }
  }

  getBrightnessFunctionRange(code) {
    const funcDic = this.getDpFunction(code);
    if (!funcDic.code) {
      return DEFAULT_BRIGHTNESS_RANGE;
    }
    if (funcDic) {
      let valueRange = JSON.parse(funcDic.values)
      let isnull = (JSON.stringify(valueRange) === "{}")
      return isnull || valueRange.min === undefined || valueRange.max === undefined ?
        DEFAULT_BRIGHTNESS_RANGE : { 'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max) };
    } else {
      return DEFAULT_BRIGHTNESS_RANGE
    }
  }

  //update device status
  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }
}

module.exports = Fanv2Accessory;
