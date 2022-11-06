/* eslint-disable @typescript-eslint/no-unused-vars */
import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceSchemaIntegerProperty } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class HeaterAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    this.configureActive();
    this.configureCurrentState();
    this.configureTargetState();
    this.configureCurrentTemp();
    this.configureLock();
    this.configureSwing();
    this.configureHeatingThreshouldTemp();
    this.configureTempDisplayUnits();
  }

  mainService() {
    return this.accessory.getService(this.Service.HeaterCooler)
      || this.accessory.addService(this.Service.HeaterCooler);
  }


  configureActive() {
    const { ACTIVE, INACTIVE } = this.Characteristic.Active;
    this.mainService().getCharacteristic(this.Characteristic.Active)
      .onGet(() => {
        const status = this.getStatus('switch');
        return (status?.value as boolean) ? ACTIVE : INACTIVE;
      })
      .onSet(value => {
        this.sendCommands([{ code: 'switch', value: (value === ACTIVE) ? true : false }]);
      });
  }

  configureCurrentState() {
    const { INACTIVE, IDLE, HEATING } = this.Characteristic.CurrentHeaterCoolerState;
    const schema = this.getSchema('work_state');
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

  configureCurrentTemp() {
    const schema = this.getSchema('temp_current');
    if (!schema) {
      this.log.warn('CurrentTemperature not supported for devId:', this.device.id);
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = property ? Math.pow(10, property.scale) : 1;
    const props = {
      minValue: Math.max(-270, property.min / multiple),
      maxValue: Math.min(100, property.max / multiple),
      minStep: Math.max(0.1, property.step / multiple),
    };
    this.log.debug('Set props for CurrentTemperature:', props);

    this.mainService().getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        let temp = status.value as number / multiple;
        temp = Math.min(props.maxValue, temp);
        temp = Math.max(props.minValue, temp);
        return temp;
      })
      .setProps(props);
  }

  configureLock() {
    const { CONTROL_LOCK_DISABLED, CONTROL_LOCK_ENABLED } = this.Characteristic.LockPhysicalControls;
    const schema = this.getSchema('lock');
    if (!schema) {
      return;
    }
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
    const { SWING_DISABLED, SWING_ENABLED } = this.Characteristic.SwingMode;
    const schema = this.getSchema('shake');
    if (!schema) {
      return;
    }
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
    const schema = this.getSchema('temp_set');
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
    this.log.debug('Set props for CurrentTemperature:', props);

    this.mainService().getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        let temp = status.value as number / multiple;
        temp = Math.min(props.maxValue, temp);
        temp = Math.max(props.minValue, temp);
        return temp;
      })
      .onSet(value => {
        this.sendCommands([{ code: schema.code, value: (value as number) * multiple}]);
      })
      .setProps(props);
  }

  configureTempDisplayUnits() {
    const schema = this.getSchema('temp_unit_convert');
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
