import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class SmokeSensor extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    const service = this.accessory.getService(this.Service.SmokeSensor)
      || this.accessory.addService(this.Service.SmokeSensor);

    service.getCharacteristic(this.Characteristic.SmokeDetected)
      .onGet(() => {
        const status = this.device.getStatus('smoke_sensor_status')
          || this.device.getStatus('smoke_sensor_state');

        if ((status && (status.value === 'alarm' || status.value === '1'))) {
          return this.Characteristic.LeakDetected.LEAK_DETECTED;
        } else {
          return this.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
        }
      });

  }

}
