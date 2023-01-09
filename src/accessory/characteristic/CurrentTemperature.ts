import { Service } from 'homebridge';
import { TuyaDeviceSchema, TuyaDeviceSchemaIntegerProperty } from '../../device/TuyaDevice';
import { limit } from '../../util/util';
import BaseAccessory from '../BaseAccessory';

export function configureCurrentTemperature(accessory: BaseAccessory, service?: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  if (!service) {
    service = accessory.accessory.getService(accessory.Service.TemperatureSensor)
      || accessory.accessory.addService(accessory.Service.TemperatureSensor);
  }

  const property = schema.property as TuyaDeviceSchemaIntegerProperty;
  const multiple = Math.pow(10, property ? property.scale : 0);
  const props = {
    minValue: Math.max(-270, property.min / multiple),
    maxValue: Math.min(100, property.max / multiple),
    minStep: Math.max(0.1, property.step / multiple),
  };
  accessory.log.debug('Set props for CurrentTemperature:', props);

  service.getCharacteristic(accessory.Characteristic.CurrentTemperature)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      return limit(status.value as number / multiple, props.minValue, props.maxValue);
    })
    .setProps(props);

}
