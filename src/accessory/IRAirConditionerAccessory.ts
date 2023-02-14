import debounce from 'debounce';
import BaseAccessory from './BaseAccessory';

const POWER_OFF = 0;
const POWER_ON = 1;

const AC_MODE_COOL = 0;
const AC_MODE_HEAT = 1;
const AC_MODE_AUTO = 2;
const AC_MODE_FAN = 3;
const AC_MODE_DEHUMIDIFIER = 4;

// const FAN_SPEED_AUTO = 0;
// const FAN_SPEED_LOW = 1;
// const FAN_SPEED_MEDIUM = 2;
// const FAN_SPEED_HIGH = 3;

export default class IRAirConditionerAccessory extends BaseAccessory {

  configureServices() {
    this.configureAirConditioner();
    this.configureDehumidifier();
    this.configureFan();
  }

  configureAirConditioner() {

    const service = this.mainService();
    const { INACTIVE, ACTIVE } = this.Characteristic.Active;

    // Required Characteristics
    service.getCharacteristic(this.Characteristic.Active)
      .onSet(value => {
        if (value === ACTIVE) {
          // Turn off Dehumidifier & Fan
          this.supportDehumidifier() && this.dehumidifierService().setCharacteristic(this.Characteristic.Active, INACTIVE);
          this.supportFan() && this.fanService().setCharacteristic(this.Characteristic.Active, INACTIVE);
        }
        this.debounceSendACCommands();
      });

    const { IDLE } = this.Characteristic.CurrentHeaterCoolerState;
    service.setCharacteristic(this.Characteristic.CurrentHeaterCoolerState, IDLE);

    this.configureTargetState();

    // Optional Characteristics
    this.configureRotationSpeed(service);

    const key_range = this.device.remote_keys.key_range;
    if (key_range.find(item => item.mode === AC_MODE_HEAT)) {
      const range = this.getTempRange(AC_MODE_HEAT)!;
      service.getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
        .onSet(() => {
          this.debounceSendACCommands();
        })
        .setProps({ minValue: range[0], maxValue: range[1], minStep: 1 });
    }
    if (key_range.find(item => item.mode === AC_MODE_COOL)) {
      const range = this.getTempRange(AC_MODE_COOL)!;
      service.getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
        .onSet(() => {
          this.debounceSendACCommands();
        })
        .setProps({ minValue: range[0], maxValue: range[1], minStep: 1 });
    }
  }

  configureDehumidifier() {
    if (!this.supportDehumidifier()) {
      return;
    }

    const service = this.dehumidifierService();
    const { INACTIVE, ACTIVE } = this.Characteristic.Active;

    // Required Characteristics
    service.getCharacteristic(this.Characteristic.Active)
      .onSet(value => {
        if (value === ACTIVE) {
          // Turn off AC & Fan
          this.mainService().setCharacteristic(this.Characteristic.Active, INACTIVE);
          this.supportFan() && this.fanService().setCharacteristic(this.Characteristic.Active, INACTIVE);
        }
        this.debounceSendACCommands();
      });

    const { DEHUMIDIFYING } = this.Characteristic.CurrentHumidifierDehumidifierState;
    service.setCharacteristic(this.Characteristic.CurrentHumidifierDehumidifierState, DEHUMIDIFYING);

    const { DEHUMIDIFIER } = this.Characteristic.TargetHumidifierDehumidifierState;
    service.getCharacteristic(this.Characteristic.TargetHumidifierDehumidifierState)
      .updateValue(DEHUMIDIFIER)
      .setProps({ validValues: [DEHUMIDIFIER] });

    service.setCharacteristic(this.Characteristic.CurrentRelativeHumidity, 0);

    // Optional Characteristics
    this.configureRotationSpeed(service);
  }

  configureFan() {
    if (!this.supportFan()) {
      return;
    }

    const service = this.fanService();
    const { INACTIVE, ACTIVE } = this.Characteristic.Active;

    // Required Characteristics
    service.getCharacteristic(this.Characteristic.Active)
      .onSet(value => {
        if (value === ACTIVE) {
          // Turn off AC & Fan
          this.mainService().setCharacteristic(this.Characteristic.Active, INACTIVE);
          this.supportDehumidifier() && this.dehumidifierService().setCharacteristic(this.Characteristic.Active, INACTIVE);
        }
        this.debounceSendACCommands();
      });

    // Optional Characteristics
    this.configureRotationSpeed(service);
  }

  mainService() {
    return this.accessory.getService(this.Service.HeaterCooler)
      || this.accessory.addService(this.Service.HeaterCooler);
  }

  dehumidifierService() {
    return this.accessory.getService(this.Service.HumidifierDehumidifier)
      || this.accessory.addService(this.Service.HumidifierDehumidifier, this.accessory.displayName + ' Dehumidifier');
  }

  fanService() {
    return this.accessory.getService(this.Service.Fanv2)
      || this.accessory.addService(this.Service.Fanv2, this.accessory.displayName + ' Fan');
  }

  getKeyRangeItem(mode: number) {
    return this.device.remote_keys.key_range.find(item => item.mode === mode);
  }

  supportDehumidifier() {
    return this.getKeyRangeItem(AC_MODE_DEHUMIDIFIER) !== undefined;
  }

  supportFan() {
    return this.getKeyRangeItem(AC_MODE_FAN) !== undefined;
  }

  getTempRange(mode: number) {
    const keyRangeItem = this.getKeyRangeItem(mode);
    if (!keyRangeItem || !keyRangeItem.temp_list || keyRangeItem.temp_list.length === 0) {
      return undefined;
    }

    const min = keyRangeItem.temp_list[0].temp;
    const max = keyRangeItem.temp_list[keyRangeItem.temp_list.length - 1].temp;
    return [min, max];
  }

  configureTargetState() {
    const { AUTO, HEAT, COOL } = this.Characteristic.TargetHeaterCoolerState;

    const validValues: number[] = [];
    const key_range = this.device.remote_keys.key_range;
    if (key_range.find(item => item.mode === AC_MODE_AUTO)) {
      validValues.push(AUTO);
    }
    if (key_range.find(item => item.mode === AC_MODE_HEAT)) {
      validValues.push(HEAT);
    }
    if (key_range.find(item => item.mode === AC_MODE_COOL)) {
      validValues.push(COOL);
    }

    if (validValues.length === 0) {
      this.log.warn('Invalid mode range for TargetHeaterCoolerState:', key_range);
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
      .onSet(() => {
        this.debounceSendACCommands();
      })
      .setProps({ validValues });
  }

  configureRotationSpeed(service) {
    service.getCharacteristic(this.Characteristic.RotationSpeed)
      .onSet(() => {
        this.debounceSendACCommands();
      })
      .setProps({ minValue: 0, maxValue: 3, minStep: 1, unit: 'speed' });
  }

  debounceSendACCommands = debounce(this.sendACCommands, 100);

  async sendACCommands() {

    let power = POWER_ON;
    let mode = -1;
    let temp = -1;
    let wind = -1;

    // Determine AC mode
    const { ACTIVE } = this.Characteristic.Active;
    if (this.mainService().getCharacteristic(this.Characteristic.Active).value === ACTIVE) {
      const { HEAT, COOL } = this.Characteristic.TargetHeaterCoolerState;
      const value = this.mainService().getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
        .value as number;
      if (value === HEAT) {
        mode = AC_MODE_HEAT;
      } else if (value === COOL) {
        mode = AC_MODE_COOL;
      } else {
        mode = AC_MODE_AUTO;
      }
    } else if (this.supportDehumidifier() && this.dehumidifierService().getCharacteristic(this.Characteristic.Active).value === ACTIVE) {
      mode = AC_MODE_DEHUMIDIFIER;
    } else if (this.supportFan() && this.fanService().getCharacteristic(this.Characteristic.Active).value === ACTIVE) {
      mode = AC_MODE_FAN;
    } else {
      // No mode
      power = POWER_OFF;
    }

    if (mode === AC_MODE_AUTO) {
      temp = this.mainService().getCharacteristic(this.Characteristic.CoolingThresholdTemperature).value as number;
      wind = this.mainService().getCharacteristic(this.Characteristic.RotationSpeed).value as number;
    } else if (mode === AC_MODE_HEAT) {
      temp = this.mainService().getCharacteristic(this.Characteristic.HeatingThresholdTemperature).value as number;
      wind = this.mainService().getCharacteristic(this.Characteristic.RotationSpeed).value as number;
    } else if (mode === AC_MODE_COOL) {
      temp = this.mainService().getCharacteristic(this.Characteristic.CoolingThresholdTemperature).value as number;
      wind = this.mainService().getCharacteristic(this.Characteristic.RotationSpeed).value as number;
    } else if (mode === AC_MODE_DEHUMIDIFIER) {
      temp = this.mainService().getCharacteristic(this.Characteristic.CoolingThresholdTemperature).value as number;
      wind = this.dehumidifierService().getCharacteristic(this.Characteristic.RotationSpeed).value as number;
    } else if (mode === AC_MODE_FAN) {
      temp = this.mainService().getCharacteristic(this.Characteristic.CoolingThresholdTemperature).value as number;
      wind = this.fanService().getCharacteristic(this.Characteristic.RotationSpeed).value as number;
    }

    (power === POWER_ON) && this.mainService().setCharacteristic(this.Characteristic.CurrentTemperature, temp);

    const { parent_id, id } = this.device;
    await this.deviceManager.sendInfraredACCommands(parent_id, id, power, mode, temp, wind);

  }
}
