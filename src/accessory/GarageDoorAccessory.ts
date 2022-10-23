import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class GarageDoorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    const service = this.accessory.getService(this.Service.GarageDoorOpener)
    || this.accessory.addService(this.Service.GarageDoorOpener);

    service.getCharacteristic(this.Characteristic.CurrentDoorState)
      .onGet(() => {
        const currentStatus = this.device.getDeviceStatus('doorcontact_state')!;
        const targetStatus = this.device.getDeviceStatus('switch_1')!;

        if (currentStatus.value === true && targetStatus.value === true) {
          return this.Characteristic.CurrentDoorState.OPEN;
        } else if (currentStatus.value === false && targetStatus.value === false) {
          return this.Characteristic.CurrentDoorState.CLOSED;
        } else if (currentStatus.value === false && targetStatus.value === true) {
          return this.Characteristic.CurrentDoorState.OPENING;
        } else if (currentStatus.value === true && targetStatus.value === false) {
          return this.Characteristic.CurrentDoorState.CLOSING;
        }

        return this.Characteristic.CurrentDoorState.STOPPED;

      });

    service.getCharacteristic(this.Characteristic.TargetDoorState)
      .onGet(() => {
        const status = this.device.getDeviceStatus('switch_1')!;
        return status.value ?
          this.Characteristic.TargetDoorState.OPEN :
          this.Characteristic.TargetDoorState.CLOSED;
      })
      .onSet(value => {
        this.deviceManager.sendCommands(this.device.id, [{
          code: 'switch_1',
          value: (value === this.Characteristic.TargetDoorState.OPEN) ? true : false,
        }]);
      });

  }

}
