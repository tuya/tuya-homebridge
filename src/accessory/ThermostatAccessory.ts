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

  getCurrentTempSchema() {
    return this.device.getSchema('temp_current')
      || this.device.getSchema('temp_set');
  }

  getTargetTempSchema() {
    return this.device.getSchema('temp_set');
  }

  getCurrentTempStatus() {
    return this.device.getStatus('temp_current')
      || this.device.getStatus('temp_set'); // fallback
  }

  getTargetTempStatus() {
    return this.device.getStatus('temp_set');
  }

  configureCurrentState() {
    this.mainService().getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
      .onGet(() => {
        const on = this.device.getStatus('switch');
        if (on && on.value === false) {
          return this.Characteristic.CurrentHeatingCoolingState.OFF;
        }

        const status = this.device.getStatus('work_state')
          || this.device.getStatus('mode');
        if (!status) {
          // If don't support mode, compare current and target temp.
          const current = this.getCurrentTempStatus();
          const target = this.getTargetTempStatus();
          if (!target || !current) {
            return this.Characteristic.CurrentHeatingCoolingState.OFF;
          }
          if (target.value > current.value) {
            return this.Characteristic.CurrentHeatingCoolingState.HEAT;
          } else if (target.value < current.value) {
            return this.Characteristic.CurrentHeatingCoolingState.COOL;
          } else {
            return this.Characteristic.CurrentHeatingCoolingState.OFF;
          }
        }

        if (status.value === 'hot') {
          return this.Characteristic.CurrentHeatingCoolingState.HEAT;
        } else if (status.value === 'cold' || status.value === 'eco') {
          return this.Characteristic.CurrentHeatingCoolingState.COOL;
        }
        // Don't know how to display unsupported work mode.
        return this.Characteristic.CurrentHeatingCoolingState.OFF;
      });

  }

  configureTargetState() {
    const validValues = [
      this.Characteristic.TargetHeatingCoolingState.OFF,
      this.Characteristic.TargetHeatingCoolingState.AUTO,
    ];

    const property = this.device.getSchema('mode')?.property as TuyaDeviceSchemaEnumProperty;
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
        const on = this.device.getStatus('switch');
        if (on && on.value === false) {
          return this.Characteristic.TargetHeatingCoolingState.OFF;
        }

        const status = this.device.getStatus('mode');
        if (!status) {
          // If don't support mode, display auto.
          return this.Characteristic.TargetHeatingCoolingState.AUTO;
        }

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
        const commands: TuyaDeviceStatus[] = [{
          code: 'switch',
          value: (value === this.Characteristic.TargetHeatingCoolingState.OFF) ? false : true,
        }];

        if (property) {
          if (value === this.Characteristic.TargetHeatingCoolingState.HEAT
            && property.range.includes('hot')) {
            commands.push({ code: 'mode', value: 'hot' });
          } else if (value === this.Characteristic.TargetHeatingCoolingState.COOL) {
            if (property.range.includes('eco')) {
              commands.push({ code: 'mode', value: 'eco' });
            } else if (property.range.includes('cold')) {
              commands.push({ code: 'mode', value: 'eco' });
            }
          } else if (value === this.Characteristic.TargetHeatingCoolingState.AUTO
            && property.range.includes('auto')) {
            commands.push({ code: 'mode', value: 'auto' });
          }
        }

        this.deviceManager.sendCommands(this.device.id, commands);
      })
      .setProps({ validValues });

  }

  configureCurrentTemp() {
    const props = { minValue: -270, maxValue: 100, minStep: 0.1 };
    const property = this.getCurrentTempSchema()?.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = property ? Math.pow(10, property.scale) : 1;
    if (property) {
      props.minValue = Math.max(props.minValue, property.min / multiple);
      props.maxValue = Math.min(props.maxValue, property.max / multiple);
      props.minStep = Math.max(props.minStep, property.step / multiple);
    }
    this.log.debug('Set props for CurrentTemperature:', props);

    this.mainService().getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(() => {
        const status = this.getCurrentTempStatus();
        let temp = status?.value as number / multiple;
        temp = Math.min(props.maxValue, temp);
        temp = Math.max(props.minValue, temp);
        return temp;
      })
      .setProps(props);

  }

  configureTargetTemp() {
    const props = { minValue: 10, maxValue: 38, minStep: 0.1 };
    const property = this.getTargetTempSchema()?.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = property ? Math.pow(10, property.scale) : 1;
    if (property) {
      props.minValue = Math.max(props.minValue, property.min / multiple);
      props.maxValue = Math.min(props.maxValue, property.max / multiple);
      props.minStep = Math.max(props.minStep, property.step / multiple);
    }
    this.log.debug('Set props for TargetTemperature:', props);

    this.mainService().getCharacteristic(this.Characteristic.TargetTemperature)
      .onGet(() => {
        const status = this.getTargetTempStatus();
        let temp = status?.value as number / multiple;
        temp = Math.min(props.maxValue, temp);
        temp = Math.max(props.minStep, temp);
        return temp;
      })
      .onSet(value => {
        this.deviceManager.sendCommands(this.device.id, [{
          code: 'temp_set',
          value: value as number * multiple,
        }]);
      })
      .setProps(props);

  }

  configureTempDisplayUnits() {
    if (!this.device.getStatus('temp_unit_convert')) {
      return;
    }
    this.mainService().getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
      .onGet(() => {
        const status = this.device.getStatus('temp_unit_convert');
        return (status?.value === 'c') ?
          this.Characteristic.TemperatureDisplayUnits.CELSIUS :
          this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
      })
      .onSet(value => {
        this.deviceManager.sendCommands(this.device.id, [{
          code: 'temp_unit_convert',
          value: (value === this.Characteristic.TemperatureDisplayUnits.CELSIUS) ? 'c':'f',
        }]);
      });
  }

}
