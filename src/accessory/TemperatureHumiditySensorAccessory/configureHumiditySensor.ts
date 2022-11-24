import { TuyaDeviceSchemaIntegerProperty } from '../../device/TuyaDevice';
import { limit } from '../../util/util';
import BaseAccessory from '../BaseAccessory';

export function configureHumiditySensor(accessory: BaseAccessory) {
  const schema = accessory.getSchema('va_humidity', 'humidity_value');
  if (!schema) {
    accessory.log.warn('HumiditySensor not supported.');
    return;
  }

  const service = accessory.accessory.getService(accessory.Service.HumiditySensor)
        || accessory.accessory.addService(accessory.Service.HumiditySensor);

  const property = schema.property as TuyaDeviceSchemaIntegerProperty;
  const multiple = Math.pow(10, property ? property.scale : 0);
  service.getCharacteristic(accessory.Characteristic.CurrentRelativeHumidity)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      // this.log.debug('CurrentRelativeHumidity:', 'property =', property, 'multiple =', multiple, 'status =', status);
      return limit(status.value as number / multiple, 0, 100);
    });

}