import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceStatus, TuyaDeviceFunctionEnumProperty, TuyaDeviceFunctionIntegerProperty } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class FanAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    this.configureActive();
    this.configureRotationSpeed();

    this.configureLightOn();
    this.configureLightBrightness();
  }

  fanService() {
    return this.accessory.getService(this.Service.Fanv2)
      || this.accessory.addService(this.Service.Fanv2);
  }

  lightService() {
    return this.accessory.getService(this.Service.Lightbulb)
    || this.accessory.addService(this.Service.Lightbulb);
  }

  getFanActiveStatus() {
    return this.device.getDeviceStatus('switch_fan')
      || this.device.getDeviceStatus('fan_switch')
      || this.device.getDeviceStatus('switch');
  }

  getFanSpeedFunction() {
    return this.device.getDeviceFunction('fan_speed');
  }

  getFanSpeedLevelFunction() {
    return this.device.getDeviceFunction('fan_speed_enum');
  }

  getFanSpeedLevelProperty() {
    return this.device.getDeviceFunctionProperty('fan_speed_enum') as TuyaDeviceFunctionEnumProperty | undefined;
  }

  getFanSwingStatus() {
    return this.device.getDeviceStatus('fan_horizontal');
  }

  getLightOnStatus() {
    return this.device.getDeviceStatus('light')
      || this.device.getDeviceStatus('switch_led');
  }

  getLightBrightnessStatus() {
    return this.device.getDeviceStatus('bright_value');
  }

  getLightBrightnessProperty() {
    return this.device.getDeviceFunctionProperty('bright_value') as TuyaDeviceFunctionIntegerProperty | undefined;
  }


  configureActive() {
    this.fanService().getCharacteristic(this.Characteristic.Active)
      .onGet(() => {
        const status = this.getFanActiveStatus()!;
        return status.value as boolean;
      })
      .onSet(value => {
        const status = this.getFanActiveStatus()!;
        this.deviceManager.sendCommands(this.device.id, [{
          code: status.code,
          value: (value === this.Characteristic.Active.ACTIVE) ? true : false,
        }]);
      });
  }

  configureRotationSpeed() {
    const speedFunction = this.getFanSpeedFunction();
    const speedLevelFunction = this.getFanSpeedLevelFunction();
    const speedLevelProperty = this.getFanSpeedLevelProperty();
    const props = { minValue: 0, maxValue: 100, minStep: 1};
    if (!speedFunction) {
      if (speedLevelProperty) {
        props.minStep = Math.floor(100 / (speedLevelProperty.range.length - 1));
        props.maxValue = props.minStep * (speedLevelProperty.range.length - 1);
      } else {
        props.minStep = 100;
      }
    }
    this.log.debug(`Set props for RotationSpeed: ${JSON.stringify(props)}`);

    this.fanService().getCharacteristic(this.Characteristic.RotationSpeed)
      .onGet(() => {
        if (speedFunction) {
          const status = this.device.getDeviceStatus(speedFunction.code);
          let value = Math.max(0, status?.value as number);
          value = Math.min(100, value);
          return value;
        } else {
          if (speedLevelProperty) {
            const status = this.device.getDeviceStatus(speedLevelFunction!.code)!;
            const index = speedLevelProperty.range.indexOf(status.value as string);
            return props.minStep * index;
          }

          const status = this.getFanActiveStatus()!;
          return (status.value as boolean) ? 100 : 0;
        }
      })
      .onSet(value => {
        const commands: TuyaDeviceStatus[] = [];
        if (speedFunction) {
          commands.push({ code: speedFunction.code, value: value as number });
        } else {
          if (speedLevelProperty) {
            const index = value as number / props.minStep;
            commands.push({ code: speedLevelFunction!.code, value: speedLevelProperty.range[index] });
          } else {
            const on = this.getFanActiveStatus()!;
            commands.push({ code: on.code, value: (value > 50) ? true : false });
          }
        }
        this.deviceManager.sendCommands(this.device.id, commands);
      })
      .setProps(props);
  }

  configureLightOn() {
    const status = this.getLightOnStatus();
    if (!status) {
      return;
    }

    this.lightService().getCharacteristic(this.Characteristic.On)
      .onGet(() => {
        const status = this.getLightOnStatus();
        return status?.value as boolean;
      })
      .onSet(value => {
        this.deviceManager.sendCommands(this.device.id, [{
          code: status.code,
          value: value as boolean,
        }]);
      });
  }

  configureLightBrightness() {

    const property = this.getLightBrightnessProperty();
    if (!property) {
      return;
    }

    this.lightService().getCharacteristic(this.Characteristic.Brightness)
      .onGet(() => {
        const status = this.getLightBrightnessStatus();
        let value = Math.floor(100 * (status?.value as number) / property.max);
        value = Math.max(0, value);
        value = Math.min(100, value);
        return value;
      })
      .onSet(value => {
        const status = this.getLightBrightnessStatus()!;
        this.deviceManager.sendCommands(this.device.id, [{
          code: status.code,
          value: Math.floor((value as number) * property.max / 100),
        }]);
      });
  }
}
