import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceSchemaIntegerProperty } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class TemperatureHumiditySensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    if (this.device.getStatus('va_temperature')) {
      const service = this.accessory.getService(this.Service.TemperatureSensor)
        || this.accessory.addService(this.Service.TemperatureSensor);

      const property = this.device.getSchema('va_temperature')?.property as TuyaDeviceSchemaIntegerProperty;
      const multiple = Math.pow(10, property ? property.scale : 0);
      service.getCharacteristic(this.Characteristic.CurrentTemperature)
        .onGet(() => {
          const status = this.device.getStatus('va_temperature');
          this.log.debug('CurrentTemperature:', 'property =', property, 'multiple =', multiple, 'status =', status);
          let temperature = status!.value as number / multiple;
          temperature = Math.max(-270, temperature);
          temperature = Math.min(100, temperature);
          return temperature;
        });

    }

    if (this.device.getStatus('va_humidity')) {
      const service = this.accessory.getService(this.Service.HumiditySensor)
        || this.accessory.addService(this.Service.HumiditySensor);

      const property = this.device.getSchema('va_humidity')?.property as TuyaDeviceSchemaIntegerProperty;
      const multiple = Math.pow(10, property ? property.scale : 0);
      service.getCharacteristic(this.Characteristic.CurrentRelativeHumidity)
        .onGet(() => {
          const status = this.device.getStatus('va_humidity');
          this.log.debug('CurrentRelativeHumidity:', 'property =', property, 'multiple =', multiple, 'status =', status);
          let humidity = Math.max(0, status!.value as number) / multiple;
          humidity = Math.max(0, humidity);
          humidity = Math.min(100, humidity);
          return humidity;
        });

    }

  }

}
