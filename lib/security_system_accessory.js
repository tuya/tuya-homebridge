const BaseAccessory = require('./base_accessory')

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

const TUYA_CODES = {
  MASTER_MODE: {
    _code: "master_mode",
    ARMED: "arm",
    DISARMED: "disarmed",
    HOME: "home"
  },
  SOS_STATE: {
    _code: "sos_state",
    TRIGGERED: "triggered"
  }
}

const SystemStateMap = new Map();

class SecuritySystem extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig) {
    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.SECURITY_SYSTEM,
      Service.SecuritySystem
    );
    this.statusArr = deviceConfig.status ? deviceConfig.status : [];
    this.functionArr = deviceConfig.functions ? deviceConfig.functions : [];

    this.checkAccessoryFunctions();

    //Distinguish Tuya different devices under the same HomeBridge Service
    this.deviceCategory = deviceConfig.category;

    SystemStateMap.set(TUYA_CODES.MASTER_MODE.ARMED, Characteristic.SecuritySystemCurrentState.AWAY_ARM);
    SystemStateMap.set(TUYA_CODES.MASTER_MODE.DISARMED, Characteristic.SecuritySystemCurrentState.DISARMED);
    SystemStateMap.set(TUYA_CODES.MASTER_MODE.HOME, Characteristic.SecuritySystemCurrentState.STAY_ARM);
    SystemStateMap.set(TUYA_CODES.SOS_STATE.TRIGGERED, Characteristic.SecuritySystemCurrentState.DISARMED);
    SystemStateMap.set(Characteristic.SecuritySystemCurrentState.AWAY_ARM, TUYA_CODES.MASTER_MODE.ARMED);
    SystemStateMap.set(Characteristic.SecuritySystemCurrentState.DISARMED, TUYA_CODES.MASTER_MODE.DISARMED);
    SystemStateMap.set(Characteristic.SecuritySystemCurrentState.STAY_ARM, TUYA_CODES.MASTER_MODE.HOME);
    SystemStateMap.set(Characteristic.SecuritySystemCurrentState.NIGHT_ARM, TUYA_CODES.MASTER_MODE.HOME);
    SystemStateMap.set(Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED, TUYA_CODES.SOS_STATE.TRIGGERED);

    // create handlers for required characteristics
    this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState)
      .onGet(this.handleSecuritySystemCurrentStateGet.bind(this));

    this.service.getCharacteristic(Characteristic.SecuritySystemTargetState)
      .onGet(this.handleSecuritySystemTargetStateGet.bind(this))
      .onSet(this.handleSecuritySystemTargetStateSet.bind(this));

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  getCurrentStateFromCache() {
    return this.getCachedState(this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState));
  }

  getCurrentStateFromCharacteristic() {
    return this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState).value;
  }

  getTargetStateFromCharacteristic() {
    return this.service.getCharacteristic(Characteristic.SecuritySystemTargetState).value;
  }

  /**
   * Handle requests to get the current value of the "Security System Current State" characteristic
   */
  handleSecuritySystemCurrentStateGet() {
    if(this.hasValidCache()) {
      return this.getCurrentStateFromCache();
    }
    return this.getCurrentStateFromCharacteristic();
  }

  /**
   * Handle requests to get the current value of the "Security System Target State" characteristic
   */
  handleSecuritySystemTargetStateGet() {
    let currentState;

    if(this.hasValidCache()) {
      currentState = this.getCurrentStateFromCache();
    } else {
      currentState = this.getCurrentStateFromCharacteristic();
    }

    if(currentState = Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED) {
      return this.getTargetStateFromCharacteristic();
    }

    return currentState;
  }

  /**
   * Handle requests to set the "Security System Target State" characteristic
   */
  handleSecuritySystemTargetStateSet(value) {
    let stateChangePromise = this.platform.tuyaOpenApi.sendCommand(this.deviceId, this.getCommandPayload(TUYA_CODES.MASTER_MODE._code, SystemStateMap.get(value)))
      .then(response => this.handleSendCommandResponse(response, value))
      .catch(error => this.handleSendCommandError(Characteristic.SecuritySystemCurrentState, error))

    return stateChangePromise;
  }

  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    this.isRefresh = isRefresh
    for (var status of statusArr) { this.handleStatus(status); }
  }

  handleStatus(status) {
    switch (status.code) {
      case TUYA_CODES.MASTER_MODE._code:
        this.handleMasterModeStatus(status);
        break;
      case TUYA_CODES.SOS_STATE._code:
        this.handleSosStatus(status);
        break;
    }
  }

  handleMasterModeStatus(status) {
    const currentSystemState = SystemStateMap.get(status.value);
    this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState).updateValue(currentSystemState);
    this.setCachedState(this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState), currentSystemState);
  }

  handleSosStatus(status) {
    let currentStateCharacteristic = this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState)
    if (status.value) {
      currentStateCharacteristic.updateValue(Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED);
      this.setCachedState(currentStateCharacteristic, Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED)
    } else {
      let targetState = this.getTargetStateFromCharacteristic();
      currentStateCharacteristic.updateValue(targetState);
      this.setCachedState(currentStateCharacteristic, targetState);
    }
  }

  getCommandPayload(code, value) {
    switch (code) {
      case TUYA_CODES.MASTER_MODE._code:
        return {
          "commands": [
            {
              "code": code,
              "value": value
            }
          ]
        };
      default:
        break;
    }
  }

  handleSendCommandResponse(response, value) {
      if (response) {
        this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState).setValue(value);
        this.service.getCharacteristic(Characteristic.SecuritySystemTargetState).updateValue(value);
        this.setCachedState(Characteristic.SecuritySystemCurrentState, value);
    }
  }
  
  handleSendCommandError(characteristicName, error) {
    this.log.error(`[SET][${this.homebridgeAccessory.displayName}] ${characteristicName} Error: ${error}'`);
    this.invalidateCache();
  }

  //update device status
  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }

  checkAccessoryFunctions() {
    if (!this.functionArr || (this.functionArr && this.functionArr.length == 0)) {
      this.log.log('Security system has no functions assigned. Removing accessory.')
      this.platform.removeAccessory(this.homebridgeAccessory)
      throw new Error('Security System has no functions assigned');
    }
  }
}

module.exports = SecuritySystem;
