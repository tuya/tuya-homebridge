import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class WindowCoveringAccessory extends BaseAccessory {

  mainService() {
    return this.accessory.getService(this.Service.WindowCovering)
      || this.accessory.addService(this.Service.WindowCovering);
  }

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    this.configurePositionState();
    this.configureCurrentPosition();
    this.configureTargetPosition();
  }

  configureCurrentPosition() {
    this.mainService().getCharacteristic(this.Characteristic.CurrentPosition)
      .onGet(() => {
        if (!this.positionSupported()) {
          const control = this.device.getDeviceStatus('control');
          if (control?.value === 'close') {
            return 0;
          } else if (control?.value === 'stop') {
            return 50;
          } else if (control?.value === 'open') {
            return 100;
          }
        }

        const state = this.getCurrentPosition()
          || this.getTargetPosition();
        let value = Math.max(0, state?.value as number);
        value = Math.min(100, value);
        return value;
      });
  }

  configurePositionState() {
    this.mainService().getCharacteristic(this.Characteristic.PositionState)
      .onGet(() => {
        const state = this.getWorkState();
        if (!state) {
          return this.Characteristic.PositionState.STOPPED;
        }

        const current = this.getCurrentPosition();
        const target = this.getTargetPosition();
        if (current?.value === target?.value) {
          return this.Characteristic.PositionState.STOPPED;
        }

        return (state.value === 'opening') ?
          this.Characteristic.PositionState.INCREASING :
          this.Characteristic.PositionState.DECREASING;
      });
  }

  configureTargetPosition() {
    this.mainService().getCharacteristic(this.Characteristic.TargetPosition)
      .onGet(() => {
        if (!this.positionSupported()) {
          const control = this.device.getDeviceStatus('control');
          if (control?.value === 'close') {
            return 0;
          } else if (control?.value === 'stop') {
            return 50;
          } else if (control?.value === 'open') {
            return 100;
          }
        }

        const state = this.getTargetPosition();
        let value = Math.max(0, state?.value as number);
        value = Math.min(100, value);
        return value;
      })
      .onSet(value => {
        const commands: TuyaDeviceStatus[] = [];
        if (!this.positionSupported()) {
          const control = this.device.getDeviceStatus('control');
          if (value === 0) {
            commands.push({ code: control!.code, value: 'close' });
          } else if (value === 100) {
            commands.push({ code: control!.code, value: 'open' });
          } else {
            commands.push({ code: control!.code, value: 'stop' });
          }
        } else {
          const state = this.getTargetPosition();
          commands.push({ code: state!.code, value: value as number });
        }
        this.deviceManager.sendCommands(this.device.id, commands);
      })
      .setProps({
        minStep: this.positionSupported() ? 1 : 50,
      });
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

  positionSupported() {
    // return false;
    return this.getCurrentPosition() || this.getTargetPosition();
  }

  /*
  isMotorReversed() {
    const state = this.device.getDeviceStatus('control_back_mode')
      || this.device.getDeviceStatus('control_back')
      || this.device.getDeviceStatus('opposite');
    if (!state) {
      return false;
    }

    return (state.value === 'back' || state.value === true);
  }
  */

}
