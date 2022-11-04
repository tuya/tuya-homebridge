import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class LightSensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    if (this.getStatus('bright_value')) {
      const service = this.accessory.getService(this.Service.LightSensor)
        || this.accessory.addService(this.Service.LightSensor);

      service.getCharacteristic(this.Characteristic.CurrentAmbientLightLevel)
        .onGet(() => {
          const status = this.getStatus('bright_value');
          let lightLevel = Math.max(0.0001, status!.value as number);
          lightLevel = Math.min(100000, lightLevel);
          return lightLevel;
        });

    }

  }

}
