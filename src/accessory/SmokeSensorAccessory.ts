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
        const status = this.device.getDeviceStatus('smoke_sensor_status')
          || this.device.getDeviceStatus('smoke_sensor_state');

        if ((status && (status.value === 'alarm' || status.value === '1'))) {
          return this.Characteristic.LeakDetected.LEAK_DETECTED;
        } else {
          return this.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
        }
      });

    service.getCharacteristic(this.Characteristic.StatusLowBattery)
      .onGet(() => {
        const { BATTERY_LEVEL_LOW, BATTERY_LEVEL_NORMAL } = this.Characteristic.StatusLowBattery;
        const status = this.device.getDeviceStatus('battery_state');
        if (status) {
          return (status.value === 'low') ? BATTERY_LEVEL_LOW : BATTERY_LEVEL_NORMAL;
        }

        const percent = this.device.getDeviceStatus('battery_percentage');
        if (percent) {
          return (percent.value <= 20) ? BATTERY_LEVEL_LOW : BATTERY_LEVEL_NORMAL;
        }
        return BATTERY_LEVEL_NORMAL;
      });

  }

}
