import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceFunctionEnumProperty, TuyaDeviceFunctionIntegerProperty, TuyaDeviceStatus } from '../device/TuyaDevice';
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

  getCurrentTempFunctionProperty() {
    return (this.device.getDeviceFunctionProperty('temp_current')
      || this.device.getDeviceFunctionProperty('temp_set')) as TuyaDeviceFunctionIntegerProperty | undefined;
  }

  getTargetTempFunctionProperty() {
    return this.device.getDeviceFunctionProperty('temp_set') as TuyaDeviceFunctionIntegerProperty | undefined;
  }

  getCurrentTempDeviceStatus() {
    return this.device.getDeviceStatus('temp_current')
      || this.device.getDeviceStatus('temp_set'); // fallback
  }

  getTargetTempDeviceStatus() {
    return this.device.getDeviceStatus('temp_set');
  }

  configureCurrentState() {
    this.mainService().getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
      .onGet(() => {
        const on = this.device.getDeviceStatus('switch');
        if (on && on.value === false) {
          return this.Characteristic.CurrentHeatingCoolingState.OFF;
        }

        const status = this.device.getDeviceStatus('work_state')
          || this.device.getDeviceStatus('mode');
        if (!status) {
          // If don't support mode, compare current and target temp.
          const current = this.getCurrentTempDeviceStatus();
          const target = this.getTargetTempDeviceStatus();
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

  }

  configureTargetState() {
    const validValues = [
      this.Characteristic.TargetHeatingCoolingState.OFF,
      this.Characteristic.TargetHeatingCoolingState.AUTO,
    ];

    const mode = this.device.getDeviceFunctionProperty('mode') as TuyaDeviceFunctionEnumProperty | undefined;
    if (mode) {
      if (mode.range.includes('hot')) {
        validValues.push(this.Characteristic.TargetHeatingCoolingState.HEAT);
      }
      if (mode.range.includes('cold')) {
        validValues.push(this.Characteristic.TargetHeatingCoolingState.COOL);
      }
    }

    this.mainService().getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
      .onGet(() => {
        const on = this.device.getDeviceStatus('switch');
        if (on && on.value === false) {
          return this.Characteristic.TargetHeatingCoolingState.OFF;
        }

        const status = this.device.getDeviceStatus('mode');
        if (!status) {
          // If don't support mode, display auto.
          return this.Characteristic.TargetHeatingCoolingState.AUTO;
        }

        if (status.value === 'hot') {
          return this.Characteristic.TargetHeatingCoolingState.HEAT;
        } else if (status.value === 'cold') {
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

  }

  configureCurrentTemp() {
    const props = { minValue: -270, maxValue: 100, minStep: 0.1 };
    const tempFunction = this.getCurrentTempFunctionProperty();
    const multiple = tempFunction ? Math.pow(10, tempFunction.scale) : 1;
    if (tempFunction) {
      props.minValue = Math.max(props.minValue, tempFunction.min / multiple);
      props.maxValue = Math.min(props.maxValue, tempFunction.max / multiple);
      props.minStep = Math.max(props.minStep, tempFunction.step / multiple);
    }
    this.log.debug(`Set props for CurrentTemperature: ${JSON.stringify(tempFunction)}`);

    this.mainService().getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(() => {
        const status = this.getCurrentTempDeviceStatus();
        let temp = status?.value as number / multiple;
        temp = Math.min(props.maxValue, temp);
        temp = Math.max(props.minValue, temp);
        return temp;
      })
      .setProps(props);

  }

  configureTargetTemp() {
    const props = { minValue: 10, maxValue: 38, minStep: 0.1 };
    const tempFunction = this.getTargetTempFunctionProperty();
    const multiple = tempFunction ? Math.pow(10, tempFunction.scale) : 1;
    if (tempFunction) {
      props.minValue = Math.max(props.minValue, tempFunction.min / multiple);
      props.maxValue = Math.min(props.maxValue, tempFunction.max / multiple);
      props.minStep = Math.max(props.minStep, tempFunction.step / multiple);
    }
    this.log.debug(`Set props for TargetTemperature: ${JSON.stringify(tempFunction)}`);

    this.mainService().getCharacteristic(this.Characteristic.TargetTemperature)
      .onGet(() => {
        const status = this.getTargetTempDeviceStatus();
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
    if (!this.device.getDeviceStatus('temp_unit_convert')) {
      return;
    }
    this.mainService().getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
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
