import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaIntegerProperty, TuyaDeviceSchemaType } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class FanAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    this.configureActive();
    if (this.getFanSpeedSchema()) {
      this.configureRotationSpeed();
    } else if (this.getFanSpeedLevelSchema()) {
      this.configureRotationSpeedLevel();
    } else {
      this.configureRotationSpeedOn();
    }

    this.configureRotationDirection();

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

  getFanActiveSchema() {
    return this.getSchema('switch_fan')
      || this.getSchema('fan_switch')
      || this.getSchema('switch');
  }

  getFanSpeedSchema() {
    const schema = this.getSchema('fan_speed');
    if (schema && schema.type === TuyaDeviceSchemaType.Integer) {
      return schema;
    }
    return undefined;
  }

  getFanSpeedLevelSchema() {
    const schema = this.getSchema('fan_speed_enum')
      || this.getSchema('fan_speed');
    if (schema && schema.type === TuyaDeviceSchemaType.Enum) {
      return schema;
    }
    return undefined;
  }

  getFanDirection() {
    return this.getSchema('fan_direction');
  }

  getLightOnSchema() {
    return this.getSchema('light')
      || this.getSchema('switch_led');
  }

  getLightBrightnessSchema() {
    return this.getSchema('bright_value');
  }


  configureActive() {
    const schema = this.getFanActiveSchema()!;
    if (!schema) {
      return;
    }

    const { ACTIVE, INACTIVE } = this.Characteristic.Active;
    this.fanService().getCharacteristic(this.Characteristic.Active)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return status.value as boolean ? ACTIVE : INACTIVE;
      })
      .onSet(value => {
        const status = this.getStatus(schema.code)!;
        this.sendCommands([{
          code: status.code,
          value: (value === ACTIVE) ? true : false,
        }], true);
      });
  }

  configureRotationSpeed() {
    const schema = this.getFanSpeedSchema()!;
    this.fanService().getCharacteristic(this.Characteristic.RotationSpeed)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        let value = Math.max(0, status.value as number);
        value = Math.min(100, value);
        return value;
      })
      .onSet(value => {
        this.sendCommands([{ code: schema.code, value: value as number }], true);
      });
  }

  configureRotationSpeedLevel() {
    const schema = this.getFanSpeedLevelSchema()!;
    const property = schema.property as TuyaDeviceSchemaEnumProperty;
    const props = { minValue: 0, maxValue: 100, minStep: 1};
    props.minStep = Math.floor(100 / (property.range.length - 1));
    props.maxValue = props.minStep * (property.range.length - 1);
    this.log.debug('Set props for RotationSpeed:', props);

    this.fanService().getCharacteristic(this.Characteristic.RotationSpeed)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const index = property.range.indexOf(status.value as string);
        return props.minStep * index;
      })
      .onSet(value => {
        const index = value as number / props.minStep;
        value = property.range[index].toString();
        this.log.debug('Set RotationSpeed to:', value);
        this.sendCommands([{ code: schema.code, value }], true);
      })
      .setProps(props);
  }

  configureRotationSpeedOn() {
    const schema = this.getFanActiveSchema()!;
    const props = { minValue: 0, maxValue: 100, minStep: 100};
    this.log.debug('Set props for RotationSpeed:', props);

    this.fanService().getCharacteristic(this.Characteristic.RotationSpeed)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value as boolean) ? 100 : 0;
      })
      .onSet(value => {
        const status = this.getStatus(schema.code)!;
        this.sendCommands([{ code: status.code, value: (value > 50) ? true : false }], true);
      })
      .setProps(props);
  }

  configureRotationDirection() {
    const schema = this.getFanDirection();
    if (!schema) {
      return;
    }

    const { CLOCKWISE, COUNTER_CLOCKWISE } = this.Characteristic.RotationDirection;
    this.fanService().getCharacteristic(this.Characteristic.RotationDirection)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value !== 'reverse') ? CLOCKWISE : COUNTER_CLOCKWISE;
      })
      .onSet(value => {
        this.sendCommands([{ code: schema.code, value: (value === CLOCKWISE) ? 'forward' : 'reverse' }]);
      });
  }

  configureLightOn() {
    const schema = this.getLightOnSchema();
    if (!schema) {
      return;
    }

    this.lightService().getCharacteristic(this.Characteristic.On)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return status.value as boolean;
      })
      .onSet(value => {
        this.sendCommands([{
          code: schema.code,
          value: value as boolean,
        }], true);
      });
  }

  configureLightBrightness() {
    const schema = this.getLightBrightnessSchema();
    if (!schema) {
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    this.lightService().getCharacteristic(this.Characteristic.Brightness)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        let value = Math.floor(100 * (status.value as number) / property.max);
        value = Math.max(0, value);
        value = Math.min(100, value);
        return value;
      })
      .onSet(value => {
        const status = this.getStatus(schema.code)!;
        this.sendCommands([{
          code: status.code,
          value: Math.floor((value as number) * property.max / 100),
        }], true);
      });
  }
}
