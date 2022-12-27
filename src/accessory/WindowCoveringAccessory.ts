import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  CURRENT_POSITION: ['percent_state'],
  TARGET_POSITION_CONTROL: ['control'],
  TARGET_POSITION_PERCENT: ['percent_control', 'position'],
  // POSITION_STATE: ['work_state'],
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
        if (currentSchema) {
          const status = this.getStatus(currentSchema.code)!;
          return limit(status.value as number, 0, 100);
        } else if (targetSchema) {
          const status = this.getStatus(targetSchema.code)!;
          return limit(status.value as number, 0, 100);
        }

        const status = this.getStatus(targetControlSchema.code)!;
        if (status.value === 'close') {
          return 0;
        } else if (status.value === 'stop') {
          return 50;
        } else if (status.value === 'open') {
          return 100;
        }

        this.log.warn('Unknown CurrentPosition:', status.value);
        return 50;
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
          return INCREASING;
        } else if (targetStatus.value === 0 && currentStatus.value !== 0) {
          return DECREASING;
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
        return limit(status.value as number, 0, 100);
      })
      .onSet(value => {
        this.sendCommands([{ code: schema.code, value: value as number }], true);
      });
  }

  configureTargetPositionControl() {
    const schema = this.getSchema(...SCHEMA_CODE.TARGET_POSITION_CONTROL);
    if (!schema) {
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.TargetPosition)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        if (status.value === 'close') {
          return 0;
        } else if (status.value === 'stop') {
          return 50;
        } else if (status.value === 'open') {
          return 100;
        }

        this.log.warn('Unknown TargetPosition:', status.value);
        return 50;
      })
      .onSet(value => {
        let control: string;
        if (value === 0) {
          control = 'close';
        } else if (value === 100) {
          control = 'open';
        } else {
          control = 'stop';
        }
        this.sendCommands([{ code: 'control', value: control }], true);
      })
      .setProps({
        minStep: 50,
      });
  }

  /*
  isMotorReversed() {
    const state = this.getStatus('control_back_mode')
      || this.getStatus('control_back')
      || this.getStatus('opposite');
    if (!state) {
      return false;
    }

    return (state.value === 'back' || state.value === true);
  }
  */

}
