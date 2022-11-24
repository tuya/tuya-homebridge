/* eslint-disable @typescript-eslint/no-unused-vars */
import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceSchemaIntegerProperty } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureActive } from './characteristic/Active';
import { configureCurrentTemperature } from './characteristic/CurrentTemperature';

const SCHEMA_CODE = {
  ACTIVE: ['switch'],
  WORK_STATE: ['work_state'],
  CURRENT_TEMP: ['temp_current'],
  TARGET_TEMP: ['temp_set'],
  LOCK: ['lock'],
  SWING: ['shake'],
  TEMP_UNIT_CONVERT: ['temp_unit_convert'],
};

export default class HeaterAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    configureActive(this, this.mainService(), this.getSchema(...SCHEMA_CODE.ACTIVE));
    this.configureCurrentState();
    this.configureTargetState();
    configureCurrentTemperature(this, this.mainService(), this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));
    this.configureLock();
    this.configureSwing();
    this.configureHeatingThreshouldTemp();
    this.configureTempDisplayUnits();
  }

  requiredSchema() {
    return [SCHEMA_CODE.ACTIVE];
  }

  mainService() {
    return this.accessory.getService(this.Service.HeaterCooler)
      || this.accessory.addService(this.Service.HeaterCooler);
  }


  configureCurrentState() {
    const schema = this.getSchema(...SCHEMA_CODE.WORK_STATE);
    const { INACTIVE, IDLE, HEATING } = this.Characteristic.CurrentHeaterCoolerState;
    this.mainService().getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
      .onGet(() => {
        if (!schema) {
          return IDLE;
        }
        const status = this.getStatus(schema.code)!;
        if (status.value === 'heating') {
          return HEATING;
        } else if (status.value === 'warming') {
          return IDLE;
        }

        return INACTIVE;
      });
  }

  configureTargetState() {
    const { AUTO, HEAT, COOL } = this.Characteristic.TargetHeaterCoolerState;
    const validValues = [ AUTO ];
    this.mainService().getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
      .onGet(() => {
        return AUTO;
      })
      .onSet(value => {
        // TODO
      })
      .setProps({ validValues });
  }

  configureLock() {
    const schema = this.getSchema(...SCHEMA_CODE.LOCK);
    if (!schema) {
      return;
    }

    const { CONTROL_LOCK_DISABLED, CONTROL_LOCK_ENABLED } = this.Characteristic.LockPhysicalControls;
    this.mainService().getCharacteristic(this.Characteristic.LockPhysicalControls)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value as boolean) ? CONTROL_LOCK_ENABLED : CONTROL_LOCK_DISABLED;
      })
      .onSet(value => {
        this.sendCommands([{ code: schema.code, value: (value === CONTROL_LOCK_ENABLED) ? true : false }]);
      });
  }

  configureSwing() {
    const schema = this.getSchema(...SCHEMA_CODE.SWING);
    if (!schema) {
      return;
    }

    const { SWING_DISABLED, SWING_ENABLED } = this.Characteristic.SwingMode;
    this.mainService().getCharacteristic(this.Characteristic.SwingMode)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value as boolean) ? SWING_ENABLED : SWING_DISABLED;
      })
      .onSet(value => {
        this.sendCommands([{ code: schema.code, value: (value === SWING_ENABLED) ? true : false }]);
      });
  }

  configureHeatingThreshouldTemp() {
    const schema = this.getSchema(...SCHEMA_CODE.TARGET_TEMP);
    if (!schema) {
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = property ? Math.pow(10, property.scale) : 1;
    const props = {
      minValue: Math.max(0, property.min / multiple),
      maxValue: Math.min(25, property.max / multiple),
      minStep: Math.max(0.1, property.step / multiple),
    };
    this.log.debug('Set props for HeatingThresholdTemperature:', props);

    this.mainService().getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const temp = status.value as number / multiple;
        return limit(temp, props.minValue, props.maxValue);
      })
      .onSet(value => {
        this.sendCommands([{ code: schema.code, value: (value as number) * multiple}]);
      })
      .setProps(props);
  }

  configureTempDisplayUnits() {
    const schema = this.getSchema(...SCHEMA_CODE.TEMP_UNIT_CONVERT);
    if (!schema) {
      return;
    }
    this.mainService().getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value === 'c') ?
          this.Characteristic.TemperatureDisplayUnits.CELSIUS :
          this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
      })
      .onSet(value => {
        this.sendCommands([{
          code: schema.code,
          value: (value === this.Characteristic.TemperatureDisplayUnits.CELSIUS) ? 'c':'f',
        }]);
      });
  }

}
