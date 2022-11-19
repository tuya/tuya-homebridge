import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceSchemaIntegerProperty } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  SENSOR_STATUS: ['va_temperature', 'va_humidity', 'humidity_value'],
};

export default class TemperatureHumiditySensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    this.configureTemperatureSensor();
    this.configureHumiditySensor();
  }

  requiredSchema() {
    return [SCHEMA_CODE.SENSOR_STATUS];
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
        const status = this.getStatus(schema.code)!;
        // this.log.debug('CurrentTemperature:', 'property =', property, 'multiple =', multiple, 'status =', status);
        return limit(status.value as number / multiple, -270, 100);
      });

  }

  configureHumiditySensor() {
    const schema = this.getSchema('va_humidity', 'humidity_value');
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
        const status = this.getStatus(schema.code)!;
        // this.log.debug('CurrentRelativeHumidity:', 'property =', property, 'multiple =', multiple, 'status =', status);
        return limit(status.value as number / multiple, 0, 100);
      });

  }

}
