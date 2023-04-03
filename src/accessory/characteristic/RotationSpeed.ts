import { Service } from 'homebridge';
import { TuyaDeviceSchema, TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaIntegerProperty } from '../../device/TuyaDevice';
import { limit } from '../../util/util';
import BaseAccessory from '../BaseAccessory';

export function configureRotationSpeed(
  accessory: BaseAccessory,
  service: Service,
  schema?: TuyaDeviceSchema,
) {

  if (!schema) {
    return;
  }

  const property = schema.property as TuyaDeviceSchemaIntegerProperty;
  const multiple = Math.pow(10, property.scale);
  const props = {
    minValue: property.min / multiple,
    maxValue: property.max / multiple,
    minStep: Math.max(1, property.step / multiple),
  };
  service.getCharacteristic(accessory.Characteristic.RotationSpeed)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      const value = status.value as number / multiple;
      return limit(value, props.minValue, props.maxValue);
    })
    .onSet(value => {
      const speed = (value as number) * multiple;
      accessory.sendCommands([{ code: schema.code, value: speed }], true);
    })
    .setProps(props);

}

export function configureRotationSpeedLevel(
  accessory: BaseAccessory,
  service: Service,
  schema?: TuyaDeviceSchema,
  ignoreValues?: string[],
) {

  if (!schema) {
    return;
  }

  const property = schema.property as TuyaDeviceSchemaEnumProperty;
  const range: string[] = [];
  for (const value of property.range) {
    if (ignoreValues?.includes(value)) {
      continue;
    }
    range.push(value);
  }

  const props = { minValue: 0, maxValue: range.length, minStep: 1, unit: 'speed' };
  accessory.log.debug('Set props for RotationSpeed:', props);

  const onGetHandler = () => {
    const status = accessory.getStatus(schema.code)!;
    const index = range.indexOf(status.value as string);
    return limit(index + 1, props.minValue, props.maxValue);
  };

  service.getCharacteristic(accessory.Characteristic.RotationSpeed)
    .onGet(onGetHandler)
    .onSet(value => {
      accessory.log.debug('Set RotationSpeed to:', value);
      const index = Math.round(value as number - 1);
      if (index < 0 || index >= range.length) {
        accessory.log.debug('Out of range, return.');
        return;
      }
      const speedLevel = range[index].toString();
      accessory.log.debug('Set RotationSpeedLevel to:', speedLevel);
      accessory.sendCommands([{ code: schema.code, value: speedLevel }], true);
    })
    .updateValue(onGetHandler()) // ensure the value is correct before set props
    .setProps(props);
}

export function configureRotationSpeedOn(
  accessory: BaseAccessory,
  service: Service,
  schema?: TuyaDeviceSchema,
) {

  if (!schema) {
    return;
  }

  const props = { minValue: 0, maxValue: 100, minStep: 100 };
  accessory.log.debug('Set props for RotationSpeed:', props);

  service.getCharacteristic(accessory.Characteristic.RotationSpeed)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      return (status.value as boolean) ? 100 : 0;
    })
    .setProps(props);
}
