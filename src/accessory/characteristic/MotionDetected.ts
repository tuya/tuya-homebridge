import { Service } from 'homebridge';
import { TuyaDeviceSchema } from '../../device/TuyaDevice';
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
      return (status.value === 'pir');
    });
}
