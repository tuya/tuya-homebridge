import { TuyaDeviceSchemaType } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';
import { configureActive } from './characteristic/Active';
import { configureLockPhysicalControls } from './characteristic/LockPhysicalControls';
import { configureRotationSpeed, configureRotationSpeedLevel } from './characteristic/RotationSpeed';

const SCHEMA_CODE = {
  ACTIVE: ['switch'],
  MODE: ['mode'],
  LOCK: ['lock'],
  SPEED: ['speed'],
  SPEED_LEVEL: ['fan_speed_enum', 'speed'],
};

export default class AirPurifierAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ACTIVE];
  }

  configureServices() {
    configureActive(this, this.mainService(), this.getSchema(...SCHEMA_CODE.ACTIVE));
    this.configureCurrentState();
    this.configureTargetState();
    configureLockPhysicalControls(this, this.mainService(), this.getSchema(...SCHEMA_CODE.LOCK));
    if (this.getFanSpeedSchema()) {
      configureRotationSpeed(this, this.mainService(), this.getFanSpeedSchema());
    } else if (this.getFanSpeedLevelSchema()) {
      configureRotationSpeedLevel(this, this.mainService(), this.getFanSpeedLevelSchema());
    }
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

}
