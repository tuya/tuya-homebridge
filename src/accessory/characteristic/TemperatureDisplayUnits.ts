import { Service } from 'homebridge';
import { TuyaDeviceSchema } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';

export function configureTempDisplayUnits(accessory: BaseAccessory, service: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  const { CELSIUS, FAHRENHEIT } = accessory.Characteristic.TemperatureDisplayUnits;
  service.getCharacteristic(accessory.Characteristic.TemperatureDisplayUnits)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      return ((status.value as string).toLowerCase() === 'c') ? CELSIUS : FAHRENHEIT;
    })
    .onSet(value => {
      const status = accessory.getStatus(schema.code)!;
      const isLowerCase = (status.value as string).toLowerCase() === status.value;

      let unit = (value === CELSIUS) ? 'c' : 'f';
      unit = isLowerCase ? unit.toLowerCase() : unit.toUpperCase();
      accessory.sendCommands([{
        code: schema.code,
        value: unit,
      }]);
    });
}
