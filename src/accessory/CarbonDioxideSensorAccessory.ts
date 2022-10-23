import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class CarbonDioxideSensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    const service = this.accessory.getService(this.Service.CarbonDioxideSensor)
      || this.accessory.addService(this.Service.CarbonDioxideSensor);

    if (this.device.getDeviceStatus('co2_state')) {
      service.getCharacteristic(this.Characteristic.CarbonDioxideDetected)
        .onGet(() => {
          const status = this.device.getDeviceStatus('co2_state');
          return (status!.value === 'alarm') ?
            this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL :
            this.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
        });
    }

    if (this.device.getDeviceStatus('co2_value')) {
      service.getCharacteristic(this.Characteristic.CarbonDioxideLevel)
        .onGet(() => {
          const status = this.device.getDeviceStatus('co2_value');
          let value = Math.max(0, status!.value as number);
          value = Math.min(100000, value);
          return value;
        });
    }

  }

}
