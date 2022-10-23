import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class AirQualitySensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    const service = this.accessory.getService(this.Service.AirQualitySensor)
      || this.accessory.addService(this.Service.AirQualitySensor);

    service.getCharacteristic(this.Characteristic.AirQuality)
      .onGet(() => {
        const status = this.device.getDeviceStatus('pm25_value');
        if (status) {
          let pm25 = Math.max(0, status?.value as number);
          pm25 = Math.min(1000, pm25);
          if (pm25 <= 50) {
            return this.Characteristic.AirQuality.GOOD;
          } else if (pm25 <= 100) {
            return this.Characteristic.AirQuality.FAIR;
          } else if (pm25 <= 200) {
            return this.Characteristic.AirQuality.INFERIOR;
          } else {
            return this.Characteristic.AirQuality.POOR;
          }
        }

        return this.Characteristic.AirQuality.UNKNOWN;
      });

    if (this.device.getDeviceStatus('pm25_value')) {
      service.getCharacteristic(this.Characteristic.PM2_5Density)
        .onGet(() => {
          const status = this.device.getDeviceStatus('pm25_value');
          let pm25 = Math.max(0, status?.value as number);
          pm25 = Math.min(1000, pm25);
          return pm25;
        });
    }

    if (this.device.getDeviceStatus('pm10')) {
      service.getCharacteristic(this.Characteristic.PM10Density)
        .onGet(() => {
          const status = this.device.getDeviceStatus('pm10');
          let pm25 = Math.max(0, status?.value as number);
          pm25 = Math.min(1000, pm25);
          return pm25;
        });
    }

    if (this.device.getDeviceStatus('voc_value')) {
      service.getCharacteristic(this.Characteristic.VOCDensity)
        .onGet(() => {
          const status = this.device.getDeviceStatus('voc_value');
          let voc = Math.max(0, status?.value as number);
          voc = Math.min(1000, voc);
          return voc;
        });
    }
  }

}
