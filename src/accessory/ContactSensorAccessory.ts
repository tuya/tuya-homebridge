import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class ContaceSensor extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    const service = this.accessory.getService(this.Service.ContactSensor)
      || this.accessory.addService(this.Service.ContactSensor);

    service.getCharacteristic(this.Characteristic.ContactSensorState)
      .onGet(() => {
        const status = this.getStatus('doorcontact_state');
        return status!.value ?
          this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED:
          this.Characteristic.ContactSensorState.CONTACT_DETECTED;
      });

  }

}
