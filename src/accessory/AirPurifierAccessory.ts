import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaIntegerProperty, TuyaDeviceSchemaType } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import { limit, remap } from '../util/util';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  ACTIVE: ['switch'],
  MODE: ['mode'],
  LOCK: ['lock'],
  SPEED: ['speed'],
  SPEED_LEVEL: ['fan_speed_enum', 'speed'],
};

export default class AirPurifierAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    this.configureActive();
    this.configureCurrentState();
    this.configureTargetState();
    this.configureLock();
    if (this.getFanSpeedSchema()) {
      this.configureSpeed();
    } else if (this.getFanSpeedLevelSchema()) {
      this.configureSpeedLevel();
    }
  }

  requiredSchema() {
    return [SCHEMA_CODE.ACTIVE];
  }


  mainService() {
    return this.accessory.getService(this.Service.AirPurifier)
      || this.accessory.addService(this.Service.AirPurifier);
  }

  getFanSpeedSchema() {
    const schema = this.getSchema(...SCHEMA_CODE.SPEED);
    if (schema && schema.type === TuyaDeviceSchemaType.Integer) {
      return schema;
    }
    return undefined;
  }

  getFanSpeedLevelSchema() {
    const schema = this.getSchema(...SCHEMA_CODE.SPEED_LEVEL);
    if (schema && schema.type === TuyaDeviceSchemaType.Enum) {
      return schema;
    }
    return undefined;
  }

  configureActive() {
    const schema = this.getSchema(...SCHEMA_CODE.ACTIVE);
    if (!schema) {
      return;
    }

    const { ACTIVE, INACTIVE } = this.Characteristic.Active;
    this.mainService().getCharacteristic(this.Characteristic.Active)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return status.value as boolean ? ACTIVE : INACTIVE;
      })
      .onSet(value => {
        this.sendCommands([{
          code: schema.code,
          value: (value === ACTIVE) ? true : false,
        }], true);
      });
  }

  configureCurrentState() {
    const schema = this.getSchema(...SCHEMA_CODE.ACTIVE);
    if (!schema) {
      return;
    }

    const { INACTIVE, PURIFYING_AIR } = this.Characteristic.CurrentAirPurifierState;
    this.mainService().getCharacteristic(this.Characteristic.CurrentAirPurifierState)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return status.value as boolean ? PURIFYING_AIR : INACTIVE;
      });
  }

  configureTargetState() {
    const schema = this.getSchema(...SCHEMA_CODE.MODE);
    if (!schema) {
      return;
    }

    const { MANUAL, AUTO } = this.Characteristic.TargetAirPurifierState;
    this.mainService().getCharacteristic(this.Characteristic.TargetAirPurifierState)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value === 'auto') ? AUTO : MANUAL;
      })
      .onSet(value => {
        this.sendCommands([{
          code: schema.code,
          value: (value === AUTO) ? 'auto' : 'manual',
        }], true);
      });
  }

  configureLock() {
    const schema = this.getSchema(...SCHEMA_CODE.LOCK);
    if (!schema) {
      return;
    }

    const { CONTROL_LOCK_DISABLED, CONTROL_LOCK_ENABLED } = this.Characteristic.LockPhysicalControls;
    this.mainService().getCharacteristic(this.Characteristic.LockPhysicalControls)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value as boolean) ? CONTROL_LOCK_ENABLED : CONTROL_LOCK_DISABLED;
      })
      .onSet(value => {
        this.sendCommands([{
          code: schema.code,
          value: (value === CONTROL_LOCK_ENABLED) ? true : false,
        }], true);
      });
  }

  configureSpeed() {
    const schema = this.getFanSpeedSchema()!;
    const { min, max } = schema.property as TuyaDeviceSchemaIntegerProperty;
    this.mainService().getCharacteristic(this.Characteristic.RotationSpeed)
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

  configureSpeedLevel() {
    const schema = this.getFanSpeedLevelSchema()!;
    if (!schema) {
      return;
    }

    const property = schema.property as TuyaDeviceSchemaEnumProperty;
    const props = { minValue: 0, maxValue: 100, minStep: 1};
    props.minStep = Math.floor(100 / (property.range.length - 1));
    props.maxValue = props.minStep * (property.range.length - 1);
    this.log.debug('Set props for RotationSpeed:', props);

    this.mainService().getCharacteristic(this.Characteristic.RotationSpeed)
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

}
