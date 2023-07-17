import { TuyaDeviceSchemaEnumProperty } from '../device/TuyaDevice';
import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = [
  {
    NAME : 'control',
    CURRENT_POSITION: ['percent_state'],
    TARGET_POSITION_CONTROL: ['control', 'mach_operate'],
    TARGET_POSITION_PERCENT: ['percent_control', 'position'],
  },
  {
    NAME : 'control_2',
    CURRENT_POSITION: ['percent_state'],
    TARGET_POSITION_CONTROL: ['control_2', 'mach_operate'],
    TARGET_POSITION_PERCENT: ['percent_control_2', 'position'],
  },
];

export default class WindowCoveringAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE[0].TARGET_POSITION_CONTROL];//, SCHEMA_CODE[1].TARGET_POSITION_CONTROL];
  }

  configureServices() {

    let amount = 1;
    const schema = this.getSchema('control_2');
    if (schema) {
      amount = 2;
    }
    this.log.warn('Curtain amount:', amount);
    for (let i = 0; i < amount; i++) {

      this.configureCurrentPosition(i);
      this.configurePositionState(i);
      if (this.getSchema(...SCHEMA_CODE[i].TARGET_POSITION_PERCENT)) {
        this.configureTargetPositionPercent(i);
      } else {
        this.configureTargetPositionControl(i);
      }
    }
  }

  configureCurrentPosition(i : number) {
    const currentSchema = this.getSchema(...SCHEMA_CODE[i].CURRENT_POSITION);
    const targetSchema = this.getSchema(...SCHEMA_CODE[i].TARGET_POSITION_PERCENT);
    const targetControlSchema = this.getSchema(...SCHEMA_CODE[i].TARGET_POSITION_CONTROL)!;

    const service = this.accessory.getService(SCHEMA_CODE[i].NAME) ||
       this.accessory.addService(this.Service.WindowCovering, SCHEMA_CODE[i].NAME, SCHEMA_CODE[i].NAME);

    service.getCharacteristic(this.Characteristic.CurrentPosition)
      .onGet(() => {
        if (currentSchema) {
          const status = this.getStatus(currentSchema.code)!;
          return limit(status.value as number, 0, 100);
        } else if (targetSchema) {
          const status = this.getStatus(targetSchema.code)!;
          return limit(status.value as number, 0, 100);
        }

        const status = this.getStatus(targetControlSchema.code)!;
        if (status.value === 'close' || status.value === 'FZ') {
          return 0;
        } else if (status.value === 'stop' || status.value === 'STOP') {
          return 50;
        } else if (status.value === 'open' || status.value === 'ZZ') {
          return 100;
        }

        this.log.warn('Unknown CurrentPosition:', status.value);
        return 50;
      });
  }

  configurePositionState(i : number) {
    const currentSchema = this.getSchema(...SCHEMA_CODE[i].CURRENT_POSITION);
    const targetSchema = this.getSchema(...SCHEMA_CODE[i].TARGET_POSITION_PERCENT);

    const { DECREASING, INCREASING, STOPPED } = this.Characteristic.PositionState;

    const service = this.accessory.getService(SCHEMA_CODE[i].NAME) ||
       this.accessory.addService(this.Service.WindowCovering, SCHEMA_CODE[i].NAME, SCHEMA_CODE[i].NAME);

    service.getCharacteristic(this.Characteristic.PositionState)
      .onGet(() => {
        if (!currentSchema || !targetSchema) {
          return STOPPED;
        }

        const currentStatus = this.getStatus(currentSchema.code)!;
        const targetStatus = this.getStatus(targetSchema.code)!;
        if (targetStatus.value === 100 && currentStatus.value !== 100) {
          return INCREASING;
        } else if (targetStatus.value === 0 && currentStatus.value !== 0) {
          return DECREASING;
        } else {
          return STOPPED;
        }
      });
  }

  configureTargetPositionPercent(i : number) {
    const schema = this.getSchema(...SCHEMA_CODE[i].TARGET_POSITION_PERCENT);
    if (!schema) {
      return;
    }

    const service = this.accessory.getService(SCHEMA_CODE[i].NAME) ||
       this.accessory.addService(this.Service.WindowCovering, SCHEMA_CODE[i].NAME, SCHEMA_CODE[i].NAME);

    service.getCharacteristic(this.Characteristic.TargetPosition)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return limit(status.value as number, 0, 100);
      })
      .onSet(async value => {
        await this.sendCommands([{ code: schema.code, value: value as number }], true);
      });
  }

  configureTargetPositionControl(i : number) {
    const schema = this.getSchema(...SCHEMA_CODE[i].TARGET_POSITION_CONTROL);
    if (!schema) {
      return;
    }

    const isOldSchema = !(schema.property as TuyaDeviceSchemaEnumProperty).range.includes('open');

    const service = this.accessory.getService(SCHEMA_CODE[i].NAME) ||
       this.accessory.addService(this.Service.WindowCovering, SCHEMA_CODE[i].NAME, SCHEMA_CODE[i].NAME);

    service.getCharacteristic(this.Characteristic.TargetPosition)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        if (status.value === 'close' || status.value === 'FZ') {
          return 0;
        } else if (status.value === 'stop' || status.value === 'STOP') {
          return 50;
        } else if (status.value === 'open' || status.value === 'ZZ') {
          return 100;
        }

        this.log.warn('Unknown TargetPosition:', status.value);
        return 50;
      })
      .onSet(async value => {
        let control: string;
        if (value === 0) {
          control = isOldSchema ? 'FZ' : 'close';
        } else if (value === 100) {
          control = isOldSchema ? 'ZZ' : 'open';
        } else {
          control = isOldSchema ? 'STOP' :'stop';
        }
        await this.sendCommands([{ code: schema.code, value: control }], true);
      })
      .setProps({
        minStep: 50,
      });
  }

}
