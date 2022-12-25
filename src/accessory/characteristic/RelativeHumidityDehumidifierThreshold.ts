import { Service } from 'homebridge';
import { TuyaDeviceSchema, TuyaDeviceSchemaIntegerProperty } from '../../device/TuyaDevice';
import { limit } from '../../util/util';
import BaseAccessory from '../BaseAccessory';

export function configureRelativeHumidityDehumidifierThreshold(accessory: BaseAccessory, service: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  const property = schema.property as TuyaDeviceSchemaIntegerProperty;
  const multiple = Math.pow(10, property.scale);
  const props = {
    minValue: 0,
    maxValue: 100,
    minStep: Math.max(1, property.step / multiple),
  };
  accessory.log.debug('Set props for RelativeHumidityDehumidifierThreshold:', props);

  service.getCharacteristic(accessory.Characteristic.RelativeHumidityDehumidifierThreshold)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      return limit(status.value as number / multiple, 0, 100);
    })
    .onSet(value => {
      const dehumidity_set = limit(value as number * multiple, property.min, property.max);
      accessory.sendCommands([{ code: schema.code, value: dehumidity_set }]);
    })
    .setProps(props);
}
