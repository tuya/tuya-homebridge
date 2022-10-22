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
        const status = this.device.getDeviceStatus('doorcontact_state');
        return status!.value ?
          this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED:
          this.Characteristic.ContactSensorState.CONTACT_DETECTED;
      });

    if (this.device.getDeviceStatus('battery_percentage')) {
      service.getCharacteristic(this.Characteristic.StatusLowBattery)
        .onGet(() => {
          const status = this.device.getDeviceStatus('battery_percentage');
          return (status && status!.value <= 20) ?
            this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW :
            this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        });
    }

  }

}
