import { Service } from 'homebridge';
import { TuyaDeviceSchema, TuyaDeviceSchemaType } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';

export function configureMotionDetected(accessory: BaseAccessory, service?: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  if (!service) {
    service = accessory.accessory.getService(accessory.Service.MotionSensor)
      || accessory.accessory.addService(accessory.Service.MotionSensor);
  }

  service.getCharacteristic(accessory.Characteristic.MotionDetected)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      if (schema.type === TuyaDeviceSchemaType.Enum) { // pir
        return (status.value === 'pir');
      }
      return false;
    });
}
