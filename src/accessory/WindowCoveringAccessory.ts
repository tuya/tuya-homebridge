import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  CURRENT_POSITION: ['percent_state'],
  TARGET_POSITION_CONTROL: ['control'],
  TARGET_POSITION_PERCENT: ['percent_control', 'position'],
  // POSITION_STATE: ['work_state'],
  REVERSE_MODE: ['control_back_mode'],
};

export default class WindowCoveringAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.TARGET_POSITION_CONTROL];
  }

  configureServices() {
    this.configureCurrentPosition();
    this.configurePositionState();
    if (this.getSchema(...SCHEMA_CODE.TARGET_POSITION_PERCENT)) {
      this.configureTargetPositionPercent();
    } else {
      this.configureTargetPositionControl();
    }
  }


  mainService() {
    return this.accessory.getService(this.Service.WindowCovering)
      || this.accessory.addService(this.Service.WindowCovering);
  }

  configureCurrentPosition() {
    const currentSchema = this.getSchema(...SCHEMA_CODE.CURRENT_POSITION);
    const targetSchema = this.getSchema(...SCHEMA_CODE.TARGET_POSITION_PERCENT);
    const targetControlSchema = this.getSchema(...SCHEMA_CODE.TARGET_POSITION_CONTROL)!;

    this.mainService().getCharacteristic(this.Characteristic.CurrentPosition)
      .onGet(() => {
        let value: number;
        const schema = currentSchema || targetSchema;
        if (schema) {
          const status = this.getStatus(schema.code)!;
          value = limit(status.value as number, 0, 100);
        } else {
          const status = this.getStatus(targetControlSchema.code)!;
          if (status.value === 'close') {
            value = 0;
          } else if (status.value === 'stop') {
            value = 50;
          } else if (status.value === 'open') {
            value = 100;
          } else {
            this.log.warn('Unknown CurrentPosition:', status.value);
            value = 50;
          }
        }
        return this.isMotorReversed() ? 100 - value : value;
      });
  }

  configurePositionState() {
    const currentSchema = this.getSchema(...SCHEMA_CODE.CURRENT_POSITION);
    const targetSchema = this.getSchema(...SCHEMA_CODE.TARGET_POSITION_PERCENT);

    const { DECREASING, INCREASING, STOPPED } = this.Characteristic.PositionState;
    this.mainService().getCharacteristic(this.Characteristic.PositionState)
      .onGet(() => {
        if (!currentSchema || !targetSchema) {
          return STOPPED;
        }

        const currentStatus = this.getStatus(currentSchema.code)!;
        const targetStatus = this.getStatus(targetSchema.code)!;
        if (targetStatus.value === 100 && currentStatus.value !== 100) {
          return this.isMotorReversed() ? DECREASING : INCREASING;
        } else if (targetStatus.value === 0 && currentStatus.value !== 0) {
          return this.isMotorReversed() ? INCREASING : DECREASING;
        } else {
          return STOPPED;
        }
      });
  }

  configureTargetPositionPercent() {
    const schema = this.getSchema(...SCHEMA_CODE.TARGET_POSITION_PERCENT);
    if (!schema) {
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.TargetPosition)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const value = limit(status.value as number, 0, 100);
        return this.isMotorReversed() ? 100 - value : value;
      })
      .onSet(value => {
        let position = value as number;
        position = this.isMotorReversed() ? 100 - position : position;
        this.sendCommands([{ code: schema.code, value: position }], true);
      });
  }

  configureTargetPositionControl() {
    const schema = this.getSchema(...SCHEMA_CODE.TARGET_POSITION_CONTROL);
    if (!schema) {
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.TargetPosition)
      .onGet(() => {
        let value: number;
        const status = this.getStatus(schema.code)!;
        if (status.value === 'close') {
          value = 0;
        } else if (status.value === 'stop') {
          value = 50;
        } else if (status.value === 'open') {
          value = 100;
        } else {
          this.log.warn('Unknown TargetPosition:', status.value);
          value = 50;
        }

        return this.isMotorReversed() ? 100 - value : value;
      })
      .onSet(value => {
        let control: string;
        if (value === 0) {
          control = this.isMotorReversed() ? 'open' : 'close';
        } else if (value === 100) {
          control = this.isMotorReversed() ? 'close' : 'open';
        } else {
          control = 'stop';
        }
        this.sendCommands([{ code: 'control', value: control }], true);
      })
      .setProps({
        minStep: 50,
      });
  }

  isMotorReversed() {
    const schema = this.getSchema(...SCHEMA_CODE.REVERSE_MODE);
    if (!schema) {
      return false;
    }

    const state = this.getStatus(schema.code)!;
    return (state.value === 'back' || state.value === true);
  }

}
