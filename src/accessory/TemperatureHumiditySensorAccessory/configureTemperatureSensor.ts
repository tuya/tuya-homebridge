import { TuyaDeviceSchemaIntegerProperty } from '../../device/TuyaDevice';
import { limit } from '../../util/util';
import BaseAccessory from '../BaseAccessory';

export function configureTemperatureSensor(accessory: BaseAccessory) {
  const schema = accessory.getSchema('va_temperature');
  if (!schema) {
    accessory.log.warn('TemperatureSensor not supported.');
    return;
  }

  const service = accessory.accessory.getService(accessory.Service.TemperatureSensor)
    || accessory.accessory.addService(accessory.Service.TemperatureSensor);

  const property = schema.property as TuyaDeviceSchemaIntegerProperty;
  const multiple = Math.pow(10, property ? property.scale : 0);
  service.getCharacteristic(accessory.Characteristic.CurrentTemperature)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      // accessory.log.debug('CurrentTemperature:', 'property =', property, 'multiple =', multiple, 'status =', status);
      return limit(status.value as number / multiple, -270, 100);
    });

}