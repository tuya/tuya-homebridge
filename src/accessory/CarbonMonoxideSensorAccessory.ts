import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class CarbonMonoxideSensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    const service = this.accessory.getService(this.Service.CarbonMonoxideSensor)
      || this.accessory.addService(this.Service.CarbonMonoxideSensor);

    if (this.device.getStatus('co_status')
      || this.device.getStatus('co_state')) {
      service.getCharacteristic(this.Characteristic.CarbonMonoxideDetected)
        .onGet(() => {
          const status = this.device.getStatus('co_status')
            || this.device.getStatus('co_state');
          return (status!.value === 'alarm' || status!.value === '1') ?
            this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL :
            this.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
        });
    }

    if (this.device.getStatus('co_value')) {
      service.getCharacteristic(this.Characteristic.CarbonMonoxideLevel)
        .onGet(() => {
          const status = this.device.getStatus('co_value');
          let value = Math.max(0, status!.value as number);
          value = Math.min(100, value);
          return value;
        });
    }

  }

}
