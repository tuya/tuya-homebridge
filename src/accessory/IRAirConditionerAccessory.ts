import debounce from 'debounce';
import BaseAccessory from './BaseAccessory';

const POWER_OFF = 0;
const POWER_ON = 1;

const AC_MODE_COOL = 0;
const AC_MODE_HEAT = 1;
const AC_MODE_AUTO = 2;
const AC_MODE_FAN = 3;
const AC_MODE_DEHUMIDIFIER = 4;

const FAN_SPEED_AUTO = 0;
const FAN_SPEED_LOW = 1;
// const FAN_SPEED_MEDIUM = 2;
const FAN_SPEED_HIGH = 3;

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
      .onGet(() => {
        return ([AC_MODE_COOL, AC_MODE_HEAT, AC_MODE_AUTO].includes(this.getMode()) && this.getPower() === POWER_ON) ? ACTIVE : INACTIVE;
      })
      .onSet(async value => {
        if (value === ACTIVE) {
          // Turn off Dehumidifier & Fan
          this.supportDehumidifier() && this.dehumidifierService().getCharacteristic(this.Characteristic.Active).updateValue(INACTIVE);
          this.supportFan() && this.fanService().getCharacteristic(this.Characteristic.Active).updateValue(INACTIVE);
          this.fanService().getCharacteristic(this.Characteristic.Active).value = INACTIVE;
        }

        if (value === ACTIVE && ![AC_MODE_COOL, AC_MODE_HEAT, AC_MODE_AUTO].includes(this.getMode())) {
          this.setMode(AC_MODE_AUTO);
        }
        this.setPower((value === ACTIVE) ? POWER_ON : POWER_OFF);
      });

    const { IDLE } = this.Characteristic.CurrentHeaterCoolerState;
    service.setCharacteristic(this.Characteristic.CurrentHeaterCoolerState, IDLE);

    this.configureTargetState();
    this.configureCurrentTemperature();

    // Optional Characteristics
    this.configureRotationSpeed(service);

    const key_range = this.device.remote_keys?.key_range || [];
    if (key_range.find(item => item.mode === AC_MODE_HEAT)) {
      const [minValue, maxValue] = this.getTempRange(AC_MODE_HEAT)!;
      service.getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
        .onGet(() => {
          if (this.getMode() === AC_MODE_AUTO) {
            return minValue;
          }
          return this.getTemp();
        })
        .onSet(async value => {
          if (this.getMode() === AC_MODE_AUTO) {
            return;
          }
          this.setTemp(value);
        })
        .setProps({ minValue, maxValue, minStep: 1 });
    }
    if (key_range.find(item => item.mode === AC_MODE_COOL)) {
      const [minValue, maxValue] = this.getTempRange(AC_MODE_COOL)!;
      service.getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
        .onGet(this.getTemp.bind(this))
        .onSet(this.setTemp.bind(this))
        .setProps({ minValue, maxValue, minStep: 1 });
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
      .onGet(() => {
        return (this.getMode() === AC_MODE_DEHUMIDIFIER && this.getPower() === POWER_ON) ? ACTIVE : INACTIVE;
      })
      .onSet(async value => {
        if (value === ACTIVE) {
          // Turn off AC & Fan
          this.mainService().getCharacteristic(this.Characteristic.Active).updateValue(INACTIVE);
          this.supportFan() && this.fanService().getCharacteristic(this.Characteristic.Active).updateValue(INACTIVE);
        }

        this.setMode(AC_MODE_DEHUMIDIFIER);
        this.setPower((value === ACTIVE) ? POWER_ON : POWER_OFF);
      });

    const { DEHUMIDIFYING } = this.Characteristic.CurrentHumidifierDehumidifierState;
    service.setCharacteristic(this.Characteristic.CurrentHumidifierDehumidifierState, DEHUMIDIFYING);

    const { DEHUMIDIFIER } = this.Characteristic.TargetHumidifierDehumidifierState;
    service.getCharacteristic(this.Characteristic.TargetHumidifierDehumidifierState)
      .updateValue(DEHUMIDIFIER)
      .setProps({ validValues: [DEHUMIDIFIER] });

    service.getCharacteristic(this.Characteristic.CurrentRelativeHumidity)
      .onGet(() => {
        const handler = this.getParentAccessory().accessory
          .getService(this.Service.HumiditySensor)
          ?.getCharacteristic(this.Characteristic.CurrentRelativeHumidity)['getHandler'];
        const humidity = handler ? handler() : 0;
        return humidity;
      });

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
      .onGet(() => {
        return (this.getMode() === AC_MODE_FAN && this.getPower() === POWER_ON) ? ACTIVE : INACTIVE;
      })
      .onSet(async value => {
        if (value === ACTIVE) {
          // Turn off AC & Dehumidifier
          this.mainService().getCharacteristic(this.Characteristic.Active).updateValue(INACTIVE);
          this.supportDehumidifier() && this.dehumidifierService().getCharacteristic(this.Characteristic.Active).updateValue(INACTIVE);
        }

        this.setMode(AC_MODE_FAN);
        this.setPower((value === ACTIVE) ? POWER_ON : POWER_OFF);
      });

    // Optional Characteristics
    this.configureTargetFanState(service);
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

  getPower() {
    const value = this.getStatus('power')?.value || '0';
    return (value === true || parseInt(value.toString()) === 1) ? POWER_ON : POWER_OFF;
  }

  setPower(value) {
    this.getStatus('power')!.value = value;
    this.debounceSendACCommands();
  }

  getMode() {
    const value = this.getStatus('mode')?.value || '0';
    return parseInt(value.toString());
  }

  setMode(value) {
    this.getStatus('mode')!.value = value;
    this.debounceSendACCommands();
  }

  getWind() {
    const value = this.getStatus('wind')?.value || '0';
    return parseInt(value.toString());
  }

  setWind(value) {
    this.getStatus('wind')!.value = value;
    this.debounceSendACCommands();
  }

  getTemp() {
    const value = this.getStatus('temp')?.value || '0';
    return parseInt(value.toString());
  }

  setTemp(value) {
    this.getStatus('temp')!.value = value;
    this.debounceSendACCommands();
  }

  getKeyRangeItem(mode: number) {
    const key_range = this.device.remote_keys?.key_range || [];
    return key_range.find(item => item.mode === mode);
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

    const tempList = keyRangeItem.temp_list.map((temp) => temp.temp);

    const min = Math.min(...tempList);
    const max = Math.max(...tempList);
    return [min, max];
  }

  getParentAccessory() {
    return this.platform.accessoryHandlers.find(accessory => accessory.device.id === this.device.parent_id)!;
  }

  configureTargetState() {
    const { AUTO, HEAT, COOL } = this.Characteristic.TargetHeaterCoolerState;

    const validValues: number[] = [];
    const key_range = this.device.remote_keys?.key_range || [];
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
      .onGet(() => ({
        [AC_MODE_COOL.toString()]: COOL,
        [AC_MODE_HEAT.toString()]: HEAT,
        [AC_MODE_AUTO.toString()]: AUTO,
      }[this.getMode().toString()] || AUTO))
      .onSet(async value => {
        this.setMode({
          [COOL.toString()]: AC_MODE_COOL,
          [HEAT.toString()]: AC_MODE_HEAT,
          [AUTO.toString()]: AC_MODE_AUTO,
        }[value.toString()]);
      })
      .setProps({ validValues });
  }

  configureCurrentTemperature() {
    this.mainService().getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(() => {
        const handler = this.getParentAccessory().accessory
          .getService(this.Service.TemperatureSensor)
          ?.getCharacteristic(this.Characteristic.CurrentTemperature)['getHandler'];
        const temp = handler ? handler() : this.getTemp();
        return temp;
      });
  }

  configureTargetFanState(service) {
    const { MANUAL, AUTO } = this.Characteristic.TargetFanState;
    service.getCharacteristic(this.Characteristic.TargetFanState)
      .onGet(() => (this.getWind() === FAN_SPEED_AUTO) ? AUTO : MANUAL)
      .onSet(async value => {
        this.setWind((value === AUTO) ? FAN_SPEED_AUTO : FAN_SPEED_LOW);
      });
  }

  configureRotationSpeed(service) {
    service.getCharacteristic(this.Characteristic.RotationSpeed)
      .onGet(() => (this.getWind() === FAN_SPEED_AUTO) ? FAN_SPEED_HIGH : this.getWind())
      .onSet(async value => {
        // if (this.getWind() === FAN_SPEED_AUTO) {
        //   return;
        // }
        if (value !== 0) {
          this.setWind(value);
        }
      })
      .setProps({ minValue: 0, maxValue: 3, minStep: 1, unit: 'speed' });
  }

  debounceSendACCommands = debounce(this.sendACCommands, 100);

  async sendACCommands() {
    const { parent_id, id } = this.device;
    await this.deviceManager.sendInfraredACCommands(parent_id!, id, this.getPower(), this.getMode(), this.getTemp(), this.getWind());
  }
}
