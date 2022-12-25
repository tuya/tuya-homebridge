import { Service } from 'homebridge';
import { TuyaDeviceSchema, TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaIntegerProperty } from '../../device/TuyaDevice';
import { limit, remap } from '../../util/util';
import BaseAccessory from '../BaseAccessory';

export function configureRotationSpeed(accessory: BaseAccessory, service: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  const { min, max } = schema.property as TuyaDeviceSchemaIntegerProperty;
  service.getCharacteristic(accessory.Characteristic.RotationSpeed)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      const value = Math.round(remap(status.value as number, min, max, 0, 100));
      return limit(value, 0, 100);
    })
    .onSet(value => {
      let speed = Math.round(remap(value as number, 0, 100, min, max));
      speed = limit(speed, min, max);
      accessory.sendCommands([{ code: schema.code, value: speed }], true);
    });
}

export function configureRotationSpeedLevel(accessory: BaseAccessory, service: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  const property = schema.property as TuyaDeviceSchemaEnumProperty;
  const props = { minValue: 0, maxValue: 100, minStep: 1 };
  props.minStep = Math.floor(100 / property.range.length);
  props.maxValue = props.minStep * property.range.length;
  accessory.log.debug('Set props for RotationSpeed:', props);

  service.getCharacteristic(accessory.Characteristic.RotationSpeed)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      const index = property.range.indexOf(status.value as string);
      return props.minStep * (index + 1);
    })
    .onSet(value => {
      const index = value as number / props.minStep - 1;
      if (index < 0) {
        return;
      }
      value = property.range[index].toString();
      accessory.log.debug('Set RotationSpeed to:', value);
      accessory.sendCommands([{ code: schema.code, value }], true);
    })
    .setProps(props);
}

export function configureRotationSpeedOn(accessory: BaseAccessory, service: Service, schema?: TuyaDeviceSchema) {
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
    .onSet(value => {
      accessory.sendCommands([{ code: schema.code, value: (value > 50) ? true : false }], true);
    })
    .setProps(props);
}
