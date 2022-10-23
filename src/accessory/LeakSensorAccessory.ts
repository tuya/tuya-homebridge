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
        const gas = this.device.getDeviceStatus('gas_sensor_status')
          || this.device.getDeviceStatus('gas_sensor_state');
        const ch4 = this.device.getDeviceStatus('ch4_sensor_state');
        const co = this.device.getDeviceStatus('co_status')
          || this.device.getDeviceStatus('co_state');
        const water = this.device.getDeviceStatus('watersensor_state');

        if ((gas && (gas.value === 'alarm' || gas.value === '1'))
          || (ch4 && ch4.value === 'alarm')
          || (co && (co.value === 'alarm' || co.value === '1'))
          || (water && water.value === 'alarm')) {
          return this.Characteristic.LeakDetected.LEAK_DETECTED;
        } else {
          return this.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
        }
      });

  }

}
