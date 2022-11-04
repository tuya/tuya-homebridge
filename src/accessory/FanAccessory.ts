import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceStatus, TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaIntegerProperty } from '../device/TuyaDevice';
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
    return this.getStatus('switch_fan')
      || this.getStatus('fan_switch')
      || this.getStatus('switch');
  }

  getFanSpeedSchema() {
    return this.getSchema('fan_speed');
  }

  getFanSpeedLevelSchema() {
    return this.getSchema('fan_speed_enum');
  }

  getFanSwingStatus() {
    return this.getStatus('fan_horizontal');
  }

  getLightOnStatus() {
    return this.getStatus('light')
      || this.getStatus('switch_led');
  }

  getLightBrightnessStatus() {
    return this.getStatus('bright_value');
  }

  getLightBrightnessSchema() {
    return this.getSchema('bright_value');
  }


  configureActive() {
    this.fanService().getCharacteristic(this.Characteristic.Active)
      .onGet(() => {
        const status = this.getFanActiveStatus()!;
        return status.value as boolean;
      })
      .onSet(value => {
        const status = this.getFanActiveStatus()!;
        this.sendCommands([{
          code: status.code,
          value: (value === this.Characteristic.Active.ACTIVE) ? true : false,
        }], true);
      });
  }

  configureRotationSpeed() {
    const speedSchema = this.getFanSpeedSchema();
    const speedLevelSchema = this.getFanSpeedLevelSchema();
    const speedLevelProperty = speedLevelSchema?.property as TuyaDeviceSchemaEnumProperty;
    const props = { minValue: 0, maxValue: 100, minStep: 1};
    if (!speedSchema) {
      if (speedLevelSchema) {
        props.minStep = Math.floor(100 / (speedLevelProperty.range.length - 1));
        props.maxValue = props.minStep * (speedLevelProperty.range.length - 1);
      } else {
        props.minStep = 100;
      }
    }
    this.log.debug(`Set props for RotationSpeed: ${JSON.stringify(props)}`);

    this.fanService().getCharacteristic(this.Characteristic.RotationSpeed)
      .onGet(() => {
        if (speedSchema) {
          const status = this.getStatus(speedSchema.code);
          let value = Math.max(0, status?.value as number);
          value = Math.min(100, value);
          return value;
        } else {
          if (speedLevelSchema) {
            const status = this.getStatus(speedLevelSchema.code)!;
            const index = speedLevelProperty.range.indexOf(status.value as string);
            return props.minStep * index;
          }

          const status = this.getFanActiveStatus()!;
          return (status.value as boolean) ? 100 : 0;
        }
      })
      .onSet(value => {
        const commands: TuyaDeviceStatus[] = [];
        if (speedSchema) {
          commands.push({ code: speedSchema.code, value: value as number });
        } else {
          if (speedLevelSchema) {
            const index = value as number / props.minStep;
            commands.push({ code: speedLevelSchema.code, value: speedLevelProperty.range[index] });
          } else {
            const on = this.getFanActiveStatus()!;
            commands.push({ code: on.code, value: (value > 50) ? true : false });
          }
        }
        this.sendCommands(commands, true);
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
        this.sendCommands([{
          code: status.code,
          value: value as boolean,
        }], true);
      });
  }

  configureLightBrightness() {

    const property = this.getLightBrightnessSchema()?.property as TuyaDeviceSchemaIntegerProperty;
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
        this.sendCommands([{
          code: status.code,
          value: Math.floor((value as number) * property.max / 100),
        }], true);
      });
  }
}
