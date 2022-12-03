import { Service } from 'homebridge';
import { TuyaDeviceSchema } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';

export function configureActive(accessory: BaseAccessory, service: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  const { ACTIVE, INACTIVE } = accessory.Characteristic.Active;
  service.getCharacteristic(accessory.Characteristic.Active)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      return status.value as boolean ? ACTIVE : INACTIVE;
    })
    .onSet(value => {
      accessory.sendCommands([{
        code: schema.code,
        value: (value === ACTIVE) ? true : false,
      }], true);
    });
}
