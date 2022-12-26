import { Service } from 'homebridge';
import { TuyaDeviceSchema } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';

export function configureOn(accessory: BaseAccessory, service?: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  if (!service) {
    service = accessory.accessory.getService(schema.code)
      || accessory.accessory.addService(accessory.Service.Switch, schema.code, schema.code);
  }

  service.getCharacteristic(accessory.Characteristic.On)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      return status.value as boolean;
    })
    .onSet((value) => {
      accessory.sendCommands([{
        code: schema.code,
        value: value as boolean,
      }], true);
    });
}
