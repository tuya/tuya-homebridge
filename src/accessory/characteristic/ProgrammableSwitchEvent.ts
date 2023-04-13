import { CharacteristicProps, PartialAllowingNull, Service } from 'homebridge';
import { TuyaDeviceSchema, TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaType, TuyaDeviceStatus } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';

const SINGLE_PRESS = 0;
const DOUBLE_PRESS = 1;
const LONG_PRESS = 2;

export function configureProgrammableSwitchEvent(accessory: BaseAccessory, service: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  let props: PartialAllowingNull<CharacteristicProps>;
  if (schema.type === TuyaDeviceSchemaType.Enum) {
    const { range } = schema.property as TuyaDeviceSchemaEnumProperty;
    props = GetStatelessSwitchProps(
      range.includes('click') || range.includes('single_click') || range.includes('1'),
      range.includes('double_click'),
      range.includes('press') || range.includes('long_press'),
    );
  } else {
    props = GetStatelessSwitchProps(true, false, false);
  }

  service.getCharacteristic(accessory.Characteristic.ProgrammableSwitchEvent)
    .setProps(props);
}

export function onProgrammableSwitchEvent(accessory: BaseAccessory, service: Service, status: TuyaDeviceStatus) {
  if (!accessory.intialized) {
    return;
  }

  let value: number | undefined;

  const schema = accessory.getSchema(status.code)!;
  if (schema.type === TuyaDeviceSchemaType.Raw || schema.type === TuyaDeviceSchemaType.String) { // doorbell_pic or alarm_message
    const url = Buffer.from(status.value as string, 'base64').toString('binary');
    if (url.length === 0) {
      return;
    }
    accessory.log.info('Alarm message:', url);
    value = SINGLE_PRESS;
  } else if (schema.type === TuyaDeviceSchemaType.Enum) {
    if (status.value === 'click' || status.value === 'single_click' || status.value === '1') {
      value = SINGLE_PRESS;
    } else if (status.value === 'double_click') {
      value = DOUBLE_PRESS;
    } else if (status.value === 'press' || status.value === 'long_press') {
      value = LONG_PRESS;
    }
  }

  if (value === undefined) {
    accessory.log.warn('Unknown ProgrammableSwitchEvent status:', status);
    return;
  }

  accessory.log.debug('ProgrammableSwitchEvent updateValue: %o %o', status.code, value);
  service.getCharacteristic(accessory.Characteristic.ProgrammableSwitchEvent)
    .updateValue(value);

}

// Modified version of
// https://github.com/benzman81/homebridge-http-webhooks/blob/master/src/homekit/accessories/HttpWebHookStatelessSwitchAccessory.js
function GetStatelessSwitchProps(single_press: boolean, double_press: boolean, long_press: boolean) {
  const props: PartialAllowingNull<CharacteristicProps> = {};

  if (single_press) {
    props.minValue = SINGLE_PRESS;
  } else if (double_press) {
    props.minValue = DOUBLE_PRESS;
  } else if (long_press) {
    props.minValue = LONG_PRESS;
  }

  if (single_press) {
    props.maxValue = SINGLE_PRESS;
  }

  if (double_press) {
    props.maxValue = DOUBLE_PRESS;
  }

  if (long_press) {
    props.maxValue = LONG_PRESS;
  }

  if (single_press && !double_press && long_press) {
    props.validValues = [SINGLE_PRESS, LONG_PRESS];
  }

  return props;
}
