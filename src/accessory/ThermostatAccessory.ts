import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceFunctionEnumProperty, TuyaDeviceFunctionIntegerProperty, TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class ThermostatAccessory extends BaseAccessory {
  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    const service = this.accessory.getService(this.Service.Thermostat)
      || this.accessory.addService(this.Service.Thermostat);

    service.getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
      .onGet(() => {
        const on = this.device.getDeviceStatus('switch');
        if (on && on.value === false) {
          return this.Characteristic.CurrentHeatingCoolingState.OFF;
        }

        const status = this.device.getDeviceStatus('work_state');
        if (!status) {
          // If don't support mode, compare current and target temp.
          const current = this.device.getDeviceStatus('temp_current');
          const target = this.device.getDeviceStatus('temp_set');
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
        } else if (status.value === 'cold') {
          return this.Characteristic.CurrentHeatingCoolingState.COOL;
        }
        // Don't know how to display unsupported work mode.
        return this.Characteristic.CurrentHeatingCoolingState.OFF;
      });


    const validValues = [this.Characteristic.TargetHeatingCoolingState.OFF, this.Characteristic.TargetHeatingCoolingState.AUTO];
    const mode = this.device.getDeviceFunctionProperty('mode') as TuyaDeviceFunctionEnumProperty | undefined;
    if (mode) {
      if (mode.range.includes('hot')) {
        validValues.push(this.Characteristic.TargetHeatingCoolingState.HEAT);
      }
      if (mode.range.includes('cold')) {
        validValues.push(this.Characteristic.TargetHeatingCoolingState.COOL);
      }
    }
    service.getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
      .onGet(() => {
        const on = this.device.getDeviceStatus('switch');
        if (on && on.value === false) {
          return this.Characteristic.TargetHeatingCoolingState.OFF;
        }

        const status = this.device.getDeviceStatus('mode');
        if (!status) {
          return this.Characteristic.TargetHeatingCoolingState.AUTO;
        }

        if (status.value === 'hot') {
          return this.Characteristic.TargetHeatingCoolingState.HEAT;
        } else if (status.value === 'cold') {
          return this.Characteristic.TargetHeatingCoolingState.COOL;
        } else if (status.value === 'auto') {
          return this.Characteristic.TargetHeatingCoolingState.AUTO;
        }

        return this.Characteristic.TargetHeatingCoolingState.AUTO;
      })
      .onSet(value => {
        const commands: TuyaDeviceStatus[] = [{
          code: 'switch',
          value: (value === this.Characteristic.TargetHeatingCoolingState.OFF) ? false : true,
        }];

        const mode = this.device.getDeviceFunctionProperty('mode') as TuyaDeviceFunctionEnumProperty | undefined;
        if (mode) {
          if (value === this.Characteristic.TargetHeatingCoolingState.HEAT
            && mode.range.includes('hot')) {
            commands.push({ code: 'mode', value: 'hot' });
          } else if (value === this.Characteristic.TargetHeatingCoolingState.COOL
            && mode.range.includes('cold')) {
            commands.push({ code: 'mode', value: 'cold' });
          } else if (value === this.Characteristic.TargetHeatingCoolingState.AUTO
            && mode.range.includes('auto')) {
            commands.push({ code: 'mode', value: 'auto' });
          }
        }

        this.deviceManager.sendCommands(this.device.id, commands);
      })
      .setProps({ validValues });


    const currentProps = { minValue: -270, maxValue: 100, minStep: 0.1 };
    const currentTempFunction = this.device.getDeviceFunctionProperty('temp_current') as TuyaDeviceFunctionIntegerProperty | undefined;
    if (currentTempFunction) {
      currentProps.minValue = Math.max(currentProps.minValue, currentTempFunction.min);
      currentProps.maxValue = Math.min(currentProps.maxValue, currentTempFunction.max);
      currentProps.minStep = Math.max(currentProps.minStep, currentTempFunction.step);
    }
    service.getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(() => {
        const status = this.device.getDeviceStatus('temp_current');
        let temp = status?.value as number;
        temp = Math.min(100, temp);
        temp = Math.max(-270, temp);
        return temp;
      })
      .setProps(currentProps);


    const targetTempProps = { minValue: 10, maxValue: 38, minStep: 0.1 };
    const targetTempFunction = this.device.getDeviceFunctionProperty('temp_set') as TuyaDeviceFunctionIntegerProperty | undefined;
    if (targetTempFunction) {
      targetTempProps.minValue = Math.max(targetTempProps.minValue, targetTempFunction.min);
      targetTempProps.maxValue = Math.min(targetTempProps.maxValue, targetTempFunction.max);
      targetTempProps.minStep = Math.max(targetTempProps.minStep, targetTempFunction.step);
    }
    service.getCharacteristic(this.Characteristic.TargetTemperature)
      .onGet(() => {
        const status = this.device.getDeviceStatus('temp_set');
        let temp = status?.value as number;
        temp = Math.min(38, temp);
        temp = Math.max(10, temp);
        return temp;
      })
      .onSet(value => {
        this.deviceManager.sendCommands(this.device.id, [{
          code: 'temp_set',
          value: value as number,
        }]);
      })
      .setProps(targetTempProps);


    if (this.device.getDeviceStatus('temp_unit_convert')) {
      service.getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
        .onGet(() => {
          const status = this.device.getDeviceStatus('temp_unit_convert');
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

}
