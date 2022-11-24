import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaIntegerProperty, TuyaDeviceSchemaType } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import { limit, remap } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureActive } from './characteristic/Active';

const SCHEMA_CODE = {
  FAN_ACTIVE: ['switch_fan', 'fan_switch', 'switch'],
  FAN_DIRECTION: ['fan_direction'],
  FAN_SPEED: ['fan_speed'],
  FAN_SPEED_LEVEL: ['fan_speed_enum', 'fan_speed'],
  LIGHT_ON: ['light', 'switch_led'],
  LIGHT_BRIGHTNESS: ['bright_value'],
};

export default class FanAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    configureActive(this, this.fanService(), this.getSchema(...SCHEMA_CODE.FAN_ACTIVE));
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

  requiredSchema() {
    return [SCHEMA_CODE.FAN_ACTIVE];
  }


  fanService() {
    return this.accessory.getService(this.Service.Fanv2)
      || this.accessory.addService(this.Service.Fanv2);
  }

  lightService() {
    return this.accessory.getService(this.Service.Lightbulb)
    || this.accessory.addService(this.Service.Lightbulb);
  }


  getFanSpeedSchema() {
    const schema = this.getSchema(...SCHEMA_CODE.FAN_SPEED);
    if (schema && schema.type === TuyaDeviceSchemaType.Integer) {
      return schema;
    }
    return undefined;
  }

  getFanSpeedLevelSchema() {
    const schema = this.getSchema(...SCHEMA_CODE.FAN_SPEED_LEVEL);
    if (schema && schema.type === TuyaDeviceSchemaType.Enum) {
      return schema;
    }
    return undefined;
  }


  configureRotationSpeed() {
    const schema = this.getFanSpeedSchema()!;
    const { min, max } = schema.property as TuyaDeviceSchemaIntegerProperty;
    this.fanService().getCharacteristic(this.Characteristic.RotationSpeed)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const value = Math.round(remap(status.value as number, min, max, 0, 100));
        return limit(value, 0, 100);
      })
      .onSet(value => {
        let speed = Math.round(remap(value as number, 0, 100, min, max));
        speed = limit(speed, min, max);
        this.sendCommands([{ code: schema.code, value: speed }], true);
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
    const schema = this.getSchema(...SCHEMA_CODE.FAN_ACTIVE);
    if (!schema) {
      return;
    }

    const props = { minValue: 0, maxValue: 100, minStep: 100};
    this.log.debug('Set props for RotationSpeed:', props);

    this.fanService().getCharacteristic(this.Characteristic.RotationSpeed)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value as boolean) ? 100 : 0;
      })
      .onSet(value => {
        this.sendCommands([{ code: schema.code, value: (value > 50) ? true : false }], true);
      })
      .setProps(props);
  }

  configureRotationDirection() {
    const schema = this.getSchema(...SCHEMA_CODE.FAN_DIRECTION);
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
    const schema = this.getSchema(...SCHEMA_CODE.LIGHT_ON);
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
    const schema = this.getSchema(...SCHEMA_CODE.LIGHT_BRIGHTNESS);
    if (!schema) {
      return;
    }

    const { min, max } = schema.property as TuyaDeviceSchemaIntegerProperty;
    this.lightService().getCharacteristic(this.Characteristic.Brightness)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const value = Math.round(remap(status.value as number, 0, max, 0, 100));
        return limit(value, 0, 100);
      })
      .onSet(value => {
        let brightness = Math.round(remap(value as number, 0, 100, 0, max));
        brightness = limit(brightness, min, max);
        this.sendCommands([{
          code: schema.code,
          value: brightness,
        }], true);
      });
  }
}
