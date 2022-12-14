import { Service } from 'homebridge';
import { TuyaDeviceSchema } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';

export function configureOccupancyDetected(accessory: BaseAccessory, service?: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  if (!service) {
    service = accessory.accessory.getService(accessory.Service.OccupancySensor)
      || accessory.accessory.addService(accessory.Service.OccupancySensor);
  }

  const { OCCUPANCY_DETECTED, OCCUPANCY_NOT_DETECTED } = accessory.Characteristic.OccupancyDetected;
  service.getCharacteristic(accessory.Characteristic.OccupancyDetected)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      return (status.value === 'presence') ? OCCUPANCY_DETECTED : OCCUPANCY_NOT_DETECTED;
    });
}
