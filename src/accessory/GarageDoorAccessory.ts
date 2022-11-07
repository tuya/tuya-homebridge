import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class GarageDoorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    const service = this.accessory.getService(this.Service.GarageDoorOpener)
      || this.accessory.addService(this.Service.GarageDoorOpener);

    const { OPEN, CLOSED, OPENING, CLOSING, STOPPED } = this.Characteristic.CurrentDoorState;
    service.getCharacteristic(this.Characteristic.CurrentDoorState)
      .onGet(() => {
        const currentStatus = this.getStatus('doorcontact_state');
        const targetStatus = this.getStatus('switch_1');
        if (!currentStatus || !targetStatus) {
          return STOPPED;
        }

        if (currentStatus.value === true && targetStatus.value === true) {
          return OPEN;
        } else if (currentStatus.value === false && targetStatus.value === false) {
          return CLOSED;
        } else if (currentStatus.value === false && targetStatus.value === true) {
          return OPENING;
        } else if (currentStatus.value === true && targetStatus.value === false) {
          return CLOSING;
        }

        return STOPPED;
      });

    if (this.getStatus('switch_1')) {
      service.getCharacteristic(this.Characteristic.TargetDoorState)
        .onGet(() => {
          const status = this.getStatus('switch_1')!;
          return status.value ? OPEN : CLOSED;
        })
        .onSet(value => {
          this.sendCommands([{
            code: 'switch_1',
            value: (value === OPEN) ? true : false,
          }]);
        });
    }

  }

}
