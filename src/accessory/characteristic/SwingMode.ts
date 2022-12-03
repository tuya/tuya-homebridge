import { Service } from 'homebridge';
import { TuyaDeviceSchema } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';

export function configureSwingMode(accessory: BaseAccessory, service: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  const { SWING_DISABLED, SWING_ENABLED } = accessory.Characteristic.SwingMode;
  service.getCharacteristic(accessory.Characteristic.SwingMode)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      return (status.value as boolean) ? SWING_ENABLED : SWING_DISABLED;
    })
    .onSet((value) => {
      accessory.sendCommands([{
        code: schema.code,
        value: (value === SWING_ENABLED) ? true : false,
      }], true);
    });
}
