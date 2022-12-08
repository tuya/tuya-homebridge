import { Service } from 'homebridge';
import { TuyaDeviceSchema, TuyaDeviceSchemaEnumProperty, TuyaDeviceStatus } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';

const SINGLE_PRESS = 0;
const DOUBLE_PRESS = 1;
const LONG_PRESS = 2;

export function configureProgrammableSwitchEvent(accessory: BaseAccessory, service: Service, schema?: TuyaDeviceSchema) {
  if (!schema) {
    return;
  }

  const { range } = schema.property as TuyaDeviceSchemaEnumProperty;
  const props = GetStatelessSwitchProps(
    range.includes('click') || range.includes('single_click'),
    range.includes('double_click'),
    range.includes('press') || range.includes('long_press'),
  );

  service.getCharacteristic(accessory.Characteristic.ProgrammableSwitchEvent)
    .setProps(props);
}

export function onProgrammableSwitchEvent(accessory: BaseAccessory, service: Service, status: TuyaDeviceStatus) {
  if (!accessory.intialized) {
    return;
  }

  let value: number;
  if (status.value === 'click' || status.value === 'single_click') {
    value = SINGLE_PRESS;
  } else if (status.value === 'double_click') {
    value = DOUBLE_PRESS;
  } else if (status.value === 'press' || status.value === 'long_press') {
    value = LONG_PRESS;
  } else {
    accessory.log.warn('Unknown ProgrammableSwitchEvent status:', status);
    return;
  }

  accessory.log.debug('ProgrammableSwitchEvent updateValue: %o %o', status.code, value);
  service.getCharacteristic(accessory.Characteristic.ProgrammableSwitchEvent)
    .updateValue(value);

}

// From https://github.com/benzman81/homebridge-http-webhooks/blob/master/src/homekit/accessories/HttpWebHookStatelessSwitchAccessory.js
function GetStatelessSwitchProps(single_press: boolean, double_press: boolean, long_press: boolean) {

  let props;
  if (single_press && !double_press && !long_press) {
    props = {
      minValue : SINGLE_PRESS,
      maxValue : SINGLE_PRESS,
    };
  }
  if (single_press && double_press && !long_press) {
    props = {
      minValue : SINGLE_PRESS,
      maxValue : DOUBLE_PRESS,
    };
  }
  if (single_press && !double_press && long_press) {
    props = {
      minValue : SINGLE_PRESS,
      maxValue : LONG_PRESS,
      validValues : [ SINGLE_PRESS, LONG_PRESS ],
    };
  }
  if (!single_press && double_press && !long_press) {
    props = {
      minValue : DOUBLE_PRESS,
      maxValue : DOUBLE_PRESS,
    };
  }
  if (!single_press && double_press && long_press) {
    props = {
      minValue : DOUBLE_PRESS,
      maxValue : LONG_PRESS,
    };
  }
  if (!single_press && !double_press && long_press) {
    props = {
      minValue : LONG_PRESS,
      maxValue : LONG_PRESS,
    };
  }
  if (single_press && double_press && long_press) {
    props = {
      minValue : SINGLE_PRESS,
      maxValue : LONG_PRESS,
    };
  }
  return props;
}
