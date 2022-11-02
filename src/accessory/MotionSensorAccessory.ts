import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class MotionSensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    if (this.device.getStatus('pir')) {
      const service = this.accessory.getService(this.Service.MotionSensor)
        || this.accessory.addService(this.Service.MotionSensor);

      service.getCharacteristic(this.Characteristic.MotionDetected)
        .onGet(() => {
          const status = this.device.getStatus('pir');
          return (status!.value === 'pir');
        });
    }

  }

}
