import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceFunctionIntegerProperty } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class TemperatureHumiditySensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    if (this.device.getDeviceStatus('va_temperature')) {
      const service = this.accessory.getService(this.Service.TemperatureSensor)
        || this.accessory.addService(this.Service.TemperatureSensor);

      service.getCharacteristic(this.Characteristic.CurrentTemperature)
        .onGet(() => {
          const property = this.device.getDeviceFunctionProperty('va_temperature') as TuyaDeviceFunctionIntegerProperty | undefined;
          const multiple = property ? Math.pow(10, property.scale) : 1;
          const status = this.device.getDeviceStatus('va_temperature');
          let temperature = status!.value as number / multiple;
          temperature = Math.max(-270, temperature);
          temperature = Math.min(100, temperature);
          return temperature;
        });

    }

    if (this.device.getDeviceStatus('va_humidity')) {
      const service = this.accessory.getService(this.Service.HumiditySensor)
        || this.accessory.addService(this.Service.HumiditySensor);

      service.getCharacteristic(this.Characteristic.CurrentRelativeHumidity)
        .onGet(() => {
          const status = this.device.getDeviceStatus('va_humidity');
          let humidity = Math.max(0, status!.value as number);
          humidity = Math.min(100, humidity);
          return humidity;
        });

    }

  }

}
