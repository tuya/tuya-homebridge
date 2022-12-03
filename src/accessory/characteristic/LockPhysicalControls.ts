import { Service } from 'homebridge';
import { TuyaDeviceSchema } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';

export function configureLockPhysicalControls(accessory: BaseAccessory, service: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  const { CONTROL_LOCK_DISABLED, CONTROL_LOCK_ENABLED } = accessory.Characteristic.LockPhysicalControls;
  service.getCharacteristic(accessory.Characteristic.LockPhysicalControls)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      return (status.value as boolean) ? CONTROL_LOCK_ENABLED : CONTROL_LOCK_DISABLED;
    })
    .onSet((value) => {
      accessory.sendCommands([{
        code: schema.code,
        value: (value === CONTROL_LOCK_ENABLED) ? true : false,
      }], true);
    });
}
