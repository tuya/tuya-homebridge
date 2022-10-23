import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class WindowCoveringAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    const service = this.accessory.getService(this.Service.WindowCovering)
      || this.accessory.addService(this.Service.WindowCovering);

    if (this.getCurrentPosition()) {
      service.getCharacteristic(this.Characteristic.CurrentPosition)
        .onGet(() => {
          const state = this.getCurrentPosition();
          let value = Math.max(0, state?.value as number);
          value = Math.min(100, value);
          return value;
        });
    }

    if (this.getWorkState()) {
      service.getCharacteristic(this.Characteristic.PositionState)
        .onGet(() => {
          const current = this.getCurrentPosition();
          const target = this.getTargetPosition();
          if (current?.value === target?.value) {
            return this.Characteristic.PositionState.STOPPED;
          }

          const state = this.getWorkState();
          return (state?.value === 'opening') ?
            this.Characteristic.PositionState.INCREASING :
            this.Characteristic.PositionState.DECREASING;
        });
    }

    if (this.getTargetPosition()) {
      service.getCharacteristic(this.Characteristic.TargetPosition)
        .onGet(() => {
          const state = this.getTargetPosition();
          let value = Math.max(0, state?.value as number);
          value = Math.min(100, value);
          return value;
        })
        .onSet(value => {
          const state = this.getTargetPosition();
          this.deviceManager.sendCommands(this.device.id, [{
            code: state!.code,
            value: value as number,
          }]);
        });
    }

  }

  getCurrentPosition() {
    return this.device.getDeviceStatus('percent_state'); // 0~100
  }

  getTargetPosition() {
    return this.device.getDeviceStatus('percent_control')
    || this.device.getDeviceStatus('position');  // 0~100
  }

  getWorkState() {
    return this.device.getDeviceStatus('work_state'); // opening, closing
  }

  /*
  isMotorReversed() {
    const state = this.device.getDeviceStatus('control_back_mode')
      || this.device.getDeviceStatus('opposite');
    if (!state) {
      return false;
    }

    return (state.value === 'back' || state.value === true);
  }
  */

}
