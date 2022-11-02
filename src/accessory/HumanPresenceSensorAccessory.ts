import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class HumanPresenceSensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    if (this.device.getStatus('presence_state')) {
      const service = this.accessory.getService(this.Service.OccupancySensor)
      || this.accessory.addService(this.Service.OccupancySensor);

      service.getCharacteristic(this.Characteristic.OccupancyDetected)
        .onGet(() => {
          const status = this.device.getStatus('presence_state');
          return (status?.value === 'presence') ?
            this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED :
            this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
        });
    }
  }

}
