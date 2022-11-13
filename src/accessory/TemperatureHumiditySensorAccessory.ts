import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceSchemaIntegerProperty } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class TemperatureHumiditySensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    this.configureTemperatureSensor();
    this.configureHumiditySensor();
  }

  configureTemperatureSensor() {
    const schema = this.getSchema('va_temperature');
    if (!schema) {
      this.log.warn('TemperatureSensor not supported.');
      return;
    }

    const service = this.accessory.getService(this.Service.TemperatureSensor)
      || this.accessory.addService(this.Service.TemperatureSensor);

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = Math.pow(10, property ? property.scale : 0);
    service.getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(() => {
        const status = this.getStatus(schema.code);
        // this.log.debug('CurrentTemperature:', 'property =', property, 'multiple =', multiple, 'status =', status);
        let temperature = status!.value as number / multiple;
        temperature = Math.max(-270, temperature);
        temperature = Math.min(100, temperature);
        return temperature;
      });

  }

  configureHumiditySensor() {
    const schema = this.getSchema('va_humidity')
      || this.getSchema('humidity_value');
    if (!schema) {
      this.log.warn('HumiditySensor not supported.');
      return;
    }

    const service = this.accessory.getService(this.Service.HumiditySensor)
      || this.accessory.addService(this.Service.HumiditySensor);

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = Math.pow(10, property ? property.scale : 0);
    service.getCharacteristic(this.Characteristic.CurrentRelativeHumidity)
      .onGet(() => {
        const status = this.getStatus(schema.code);
        // this.log.debug('CurrentRelativeHumidity:', 'property =', property, 'multiple =', multiple, 'status =', status);
        let humidity = Math.floor(status!.value as number / multiple);
        humidity = Math.max(0, humidity);
        humidity = Math.min(100, humidity);
        return humidity;
      });

  }

}
