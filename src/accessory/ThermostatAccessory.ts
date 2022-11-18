import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaIntegerProperty, TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class ThermostatAccessory extends BaseAccessory {
  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    this.configureCurrentState();
    this.configureTargetState();
    this.configureCurrentTemp();
    this.configureTargetTemp();
    this.configureTempDisplayUnits();

  }

  mainService() {
    return this.accessory.getService(this.Service.Thermostat)
      || this.accessory.addService(this.Service.Thermostat);
  }

  getCurrentModeSchema() {
    return this.getSchema('work_state')
    || this.getSchema('mode'); // fallback
  }

  getTargetModeSchema() {
    return this.getSchema('mode');
  }

  getCurrentTempSchema() {
    return this.getSchema('temp_current')
      || this.getSchema('temp_set'); // fallback
  }

  getTargetTempSchema() {
    return this.getSchema('temp_set');
  }

  getTempUnitConvertSchema() {
    return this.getSchema('temp_unit_convert');
  }


  configureCurrentState() {
    this.mainService().getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
      .onGet(() => {
        const on = this.getStatus('switch');
        if (on && on.value === false) {
          return this.Characteristic.CurrentHeatingCoolingState.OFF;
        }

        const schema = this.getCurrentModeSchema();
        if (!schema) {
          // If don't support mode, compare current and target temp.
          const currentSchema = this.getCurrentTempSchema();
          const targetSchema = this.getTargetTempSchema();
          if (!currentSchema || !targetSchema) {
            return this.Characteristic.CurrentHeatingCoolingState.OFF;
          }
          const current = this.getStatus(currentSchema.code)!;
          const target = this.getStatus(targetSchema.code)!;
          if (target.value > current.value) {
            return this.Characteristic.CurrentHeatingCoolingState.HEAT;
          } else if (target.value < current.value) {
            return this.Characteristic.CurrentHeatingCoolingState.COOL;
          } else {
            return this.Characteristic.CurrentHeatingCoolingState.OFF;
          }
        }

        const status = this.getStatus(schema.code)!;
        if (status.value === 'hot' || status.value === 'opened' || status.value === 'heating') {
          return this.Characteristic.CurrentHeatingCoolingState.HEAT;
        } else if (
          status.value === 'cold' ||
          status.value === 'eco' ||
          status.value === 'idle' ||
          status.value === 'window_opened'
        ) {
          return this.Characteristic.CurrentHeatingCoolingState.COOL;
        }
        // Don't know how to display unsupported work mode.
        return this.Characteristic.CurrentHeatingCoolingState.OFF;
      });

  }

  configureTargetState() {
    const validValues = [
      this.Characteristic.TargetHeatingCoolingState.AUTO,
    ];

    // Thermostat valve may not support 'Power Off'
    if (this.getStatus('switch')) {
      validValues.push(this.Characteristic.TargetHeatingCoolingState.OFF);
    }

    const schema = this.getTargetModeSchema();
    const property = schema?.property as TuyaDeviceSchemaEnumProperty;
    if (property) {
      if (property.range.includes('hot')) {
        validValues.push(this.Characteristic.TargetHeatingCoolingState.HEAT);
      }
      if (property.range.includes('cold') || property.range.includes('eco')) {
        validValues.push(this.Characteristic.TargetHeatingCoolingState.COOL);
      }
    }

    this.mainService().getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
      .onGet(() => {
        const on = this.getStatus('switch');
        if (on && on.value === false) {
          return this.Characteristic.TargetHeatingCoolingState.OFF;
        }

        if (!schema) {
          // If don't support mode, display auto.
          return this.Characteristic.TargetHeatingCoolingState.AUTO;
        }

        const status = this.getStatus(schema.code)!;
        if (status.value === 'hot') {
          return this.Characteristic.TargetHeatingCoolingState.HEAT;
        } else if (status.value === 'cold' || status.value === 'eco') {
          return this.Characteristic.TargetHeatingCoolingState.COOL;
        } else if (status.value === 'auto' || status.value === 'temp_auto') {
          return this.Characteristic.TargetHeatingCoolingState.AUTO;
        }

        // Don't know how to display unsupported mode.
        return this.Characteristic.TargetHeatingCoolingState.AUTO;
      })
      .onSet(value => {
        const commands: TuyaDeviceStatus[] = [];

        // Thermostat valve may not support 'Power Off'
        if (this.getStatus('switch')) {
          commands.push({
            code: 'switch',
            value: (value === this.Characteristic.TargetHeatingCoolingState.OFF) ? false : true,
          });
        }

        if (schema) {
          if (value === this.Characteristic.TargetHeatingCoolingState.HEAT
            && property.range.includes('hot')) {
            commands.push({ code: schema.code, value: 'hot' });
          } else if (value === this.Characteristic.TargetHeatingCoolingState.COOL) {
            if (property.range.includes('eco')) {
              commands.push({ code: schema.code, value: 'eco' });
            } else if (property.range.includes('cold')) {
              commands.push({ code: schema.code, value: 'eco' });
            }
          } else if (value === this.Characteristic.TargetHeatingCoolingState.AUTO
            && property.range.includes('auto')) {
            commands.push({ code: schema.code, value: 'auto' });
          }
        }

        if (commands.length !== 0) {
          this.sendCommands(commands);
        }
      })
      .setProps({ validValues });

  }

  configureCurrentTemp() {
    const schema = this.getCurrentTempSchema();
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

  configureTargetTemp() {
    const schema = this.getTargetTempSchema();
    if (!schema) {
      this.log.warn('TargetTemperature not supported for devId:', this.device.id);
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    let multiple = Math.pow(10, property.scale);
    let props = {
      minValue: Math.max(10, property.min / multiple),
      maxValue: Math.min(38, property.max / multiple),
      minStep: Math.max(0.1, property.step / multiple),
    };
    if (props.maxValue <= props.minValue) {
      this.log.warn('The device %s seems have a wrong schema: %o, props will be reset to the default value.', this.device.id, schema);
      multiple = 1;
      props = { minValue: 10, maxValue: 38, minStep: 1 };
    }
    this.log.debug('Set props for TargetTemperature:', props);

    this.mainService().getCharacteristic(this.Characteristic.TargetTemperature)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        let temp = status.value as number / multiple;
        temp = Math.min(props.maxValue, temp);
        temp = Math.max(props.minValue, temp);
        return temp;
      })
      .onSet(value => {
        this.sendCommands([{
          code: schema.code,
          value: value as number * multiple,
        }]);
      })
      .setProps(props);

  }

  configureTempDisplayUnits() {
    const schema = this.getTempUnitConvertSchema();
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
