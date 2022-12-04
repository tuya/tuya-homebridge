import { TuyaDeviceSchemaIntegerProperty, TuyaDeviceSchemaType } from '../device/TuyaDevice';
import { limit, remap } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureActive } from './characteristic/Active';
import { configureLockPhysicalControls } from './characteristic/LockPhysicalControls';
import { configureOn } from './characteristic/On';
import { configureRotationSpeed, configureRotationSpeedLevel, configureRotationSpeedOn } from './characteristic/RotationSpeed';
import { configureSwingMode } from './characteristic/SwingMode';

const SCHEMA_CODE = {
  FAN_ON: ['switch_fan', 'fan_switch', 'switch'],
  FAN_DIRECTION: ['fan_direction'],
  FAN_SPEED: ['fan_speed'],
  FAN_SPEED_LEVEL: ['fan_speed_enum', 'fan_speed'],
  FAN_LOCK: ['child_lock'],
  FAN_SWING: ['switch_horizontal', 'switch_vertical'],
  LIGHT_ON: ['light', 'switch_led'],
  LIGHT_BRIGHTNESS: ['bright_value'],
};

export default class FanAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.FAN_ON];
  }

  configureServices() {

    const serviceType = this.fanServiceType();
    if (serviceType === this.Service.Fan) {
      const unusedService = this.accessory.getService(this.Service.Fanv2);
      unusedService && this.accessory.removeService(unusedService);

      configureOn(this, this.fanService(), this.getSchema(...SCHEMA_CODE.FAN_ON));
    } else if (serviceType === this.Service.Fanv2) {
      const unusedService = this.accessory.getService(this.Service.Fan);
      unusedService && this.accessory.removeService(unusedService);

      configureActive(this, this.fanService(), this.getSchema(...SCHEMA_CODE.FAN_ON));
      configureLockPhysicalControls(this, this.fanService(), this.getSchema(...SCHEMA_CODE.FAN_LOCK));
      configureSwingMode(this, this.fanService(), this.getSchema(...SCHEMA_CODE.FAN_SWING));
    }

    // Common Characteristics
    if (this.getFanSpeedSchema()) {
      configureRotationSpeed(this, this.fanService(), this.getFanSpeedSchema());
    } else if (this.getFanSpeedLevelSchema()) {
      configureRotationSpeedLevel(this, this.fanService(), this.getFanSpeedLevelSchema());
    } else {
      configureRotationSpeedOn(this, this.fanService(), this.getSchema(...SCHEMA_CODE.FAN_ON));
    }

    this.configureRotationDirection();

    // Light
    if (this.getSchema(...SCHEMA_CODE.LIGHT_ON)) {
      configureOn(this, this.lightService(), this.getSchema(...SCHEMA_CODE.LIGHT_ON));
      this.configureLightBrightness();
    } else {
      this.log.warn('Remove Lightbulb Service...');
      const unusedService = this.accessory.getService(this.Service.Lightbulb);
      unusedService && this.accessory.removeService(unusedService);
    }
  }

  fanServiceType() {
    if (this.getSchema(...SCHEMA_CODE.FAN_LOCK)
      || this.getSchema(...SCHEMA_CODE.FAN_SWING)) {
      return this.Service.Fanv2;
    }
    return this.Service.Fan;
  }

  fanService() {
    const serviceType = this.fanServiceType();
    return this.accessory.getService(serviceType)
      || this.accessory.addService(serviceType);
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
