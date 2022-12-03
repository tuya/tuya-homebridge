import { Service } from 'homebridge';
import { TuyaDeviceSchema } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';

export function configureOn(accessory: BaseAccessory, service: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
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
