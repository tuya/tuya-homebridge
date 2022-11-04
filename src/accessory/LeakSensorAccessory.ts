import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class LeakSensor extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    const service = this.accessory.getService(this.Service.LeakSensor)
      || this.accessory.addService(this.Service.LeakSensor);

    service.getCharacteristic(this.Characteristic.LeakDetected)
      .onGet(() => {
        const gas = this.getStatus('gas_sensor_status')
          || this.getStatus('gas_sensor_state');
        const ch4 = this.getStatus('ch4_sensor_state');
        const water = this.getStatus('watersensor_state');

        if ((gas && (gas.value === 'alarm' || gas.value === '1'))
          || (ch4 && ch4.value === 'alarm')
          || (water && water.value === 'alarm')) {
          return this.Characteristic.LeakDetected.LEAK_DETECTED;
        } else {
          return this.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
        }
      });

  }

}
