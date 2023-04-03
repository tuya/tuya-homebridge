import { Service } from 'homebridge';
import { TuyaDeviceSchema, TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaIntegerProperty, TuyaDeviceStatus } from '../../device/TuyaDevice';
import { kelvinToHSV, kelvinToMired, miredToKelvin } from '../../util/color';
import { limit, remap } from '../../util/util';
import BaseAccessory from '../BaseAccessory';
import { configureOn } from './On';

const DEFAULT_COLOR_TEMPERATURE_KELVIN = 6500;

enum LightType {
  Unknown = 'Unknown',
  Normal = 'Normal', // Normal Accessory, similar to SwitchAccessory, OutletAccessory.
  C = 'C', // Accessory with brightness.
  CW = 'CW', // Accessory with brightness and color temperature (Cold and Warm).
  RGB = 'RGB', // Accessory with color (RGB <--> HSB).
  RGBC = 'RGBC', // Accessory with color and brightness.
  RGBCW = 'RGBCW', // Accessory with color, brightness and color temperature (two work mode).
}

type TuyaDeviceSchemaColorProperty = {
  h: TuyaDeviceSchemaIntegerProperty;
  s: TuyaDeviceSchemaIntegerProperty;
  v: TuyaDeviceSchemaIntegerProperty;
};

function getLightType(
  accessory: BaseAccessory,
  on?: TuyaDeviceSchema,
  bright?: TuyaDeviceSchema,
  temp?: TuyaDeviceSchema,
  color?: TuyaDeviceSchema,
  mode?: TuyaDeviceSchema,
) {
  const modeRange = mode && (mode.property as TuyaDeviceSchemaEnumProperty).range;
  const { h, s, v } = (color?.property || {}) as never;

  let lightType: LightType;
  if (on && bright && temp && h && s && v && modeRange && modeRange.includes('colour') && modeRange.includes('white')) {
    lightType = LightType.RGBCW;
  } else if (on && bright && !temp && h && s && v && modeRange && modeRange.includes('colour') && modeRange.includes('white')) {
    lightType = LightType.RGBC;
  } else if (on && !temp && h && s && v) {
    lightType = LightType.RGB;
  } else if (on && bright && temp) {
    lightType = LightType.CW;
  } else if (on && bright && !temp) {
    lightType = LightType.C;
  } else if (on && !bright && !temp) {
    lightType = LightType.Normal;
  } else {
    lightType = LightType.Unknown;
  }

  return lightType;
}

function getColorValue(accessory: BaseAccessory, schema: TuyaDeviceSchema) {
  const status = accessory.getStatus(schema!.code);
  if (!status || !status.value || status.value === '' || status.value === '{}') {
    return { h: 0, s: 0, v: 0 };
  }

  const { h, s, v } = JSON.parse(status.value as string);
  return {
    h: h as number,
    s: s as number,
    v: v as number,
  };
}

function inWhiteMode(
  accessory: BaseAccessory,
  lightType: LightType,
  modeSchema?: TuyaDeviceSchema,
) {
  if (lightType === LightType.C || lightType === LightType.CW) {
    return true;
  } else if (lightType === LightType.RGB) {
    return false;
  }

  if (!modeSchema) {
    return false;
  }
  const status = accessory.getStatus(modeSchema.code)!;
  return (status.value === 'white');
}

function inColorMode(
  accessory: BaseAccessory,
  lightType: LightType,
  modeSchema?: TuyaDeviceSchema,
) {
  if (lightType === LightType.RGB) {
    return true;
  } else if (lightType === LightType.C || lightType === LightType.CW) {
    return false;
  }

  if (!modeSchema) {
    return false;
  }
  const status = accessory.getStatus(modeSchema.code)!;
  return (status.value === 'colour');
}

function configureBrightness(
  accessory: BaseAccessory,
  service: Service,
  lightType: LightType,
  brightSchema?: TuyaDeviceSchema,
  colorSchema?: TuyaDeviceSchema,
  modeSchema?: TuyaDeviceSchema,
) {

  service.getCharacteristic(accessory.Characteristic.Brightness)
    .onGet(() => {
      if (inColorMode(accessory, lightType, modeSchema) && colorSchema) {
        // Color mode, get brightness from `color_data.v`
        const { max } = (colorSchema.property as TuyaDeviceSchemaColorProperty).v;
        const colorValue = getColorValue(accessory, colorSchema);
        const value = Math.round(100 * colorValue.v / max);
        return limit(value, 0, 100);
      } else if (inWhiteMode(accessory, lightType, modeSchema) && brightSchema) {
        // White mode, get brightness from `brightness_value`
        const { max } = brightSchema.property as TuyaDeviceSchemaIntegerProperty;
        const status = accessory.getStatus(brightSchema.code)!;
        const value = Math.round(100 * (status.value as number) / max);
        return limit(value, 0, 100);
      } else {
        // Unsupported mode
        return 100;
      }
    })
    .onSet((value) => {
      accessory.log.debug(`Characteristic.Brightness set to: ${value}`);
      if (inColorMode(accessory, lightType, modeSchema) && colorSchema) {
        // Color mode, set brightness to `color_data.v`
        const { min, max } = (colorSchema.property as TuyaDeviceSchemaColorProperty).v;
        const colorValue = getColorValue(accessory, colorSchema);
        colorValue.v = Math.round(value as number * max / 100);
        colorValue.v = limit(colorValue.v, min, max);
        accessory.sendCommands([{ code: colorSchema.code, value: JSON.stringify(colorValue) }], true);
      } else if (inWhiteMode(accessory, lightType, modeSchema) && brightSchema) {
        // White mode, set brightness to `brightness_value`
        const { min, max } = brightSchema.property as TuyaDeviceSchemaIntegerProperty;
        let brightValue = Math.round(value as number * max / 100);
        brightValue = limit(brightValue, min, max);
        accessory.sendCommands([{ code: brightSchema.code, value: brightValue }], true);
      } else {
        // Unsupported mode
        accessory.log.warn('Neither color mode nor white mode.');
      }
    });

}

function configureColourTemperature(
  accessory: BaseAccessory,
  service: Service,
  lightType: LightType,
  tempSchema: TuyaDeviceSchema,
  modeSchema?: TuyaDeviceSchema,
) {
  const props = { minValue: 140, maxValue: 500, minStep: 1 };

  if (lightType === LightType.RGBC) {
    props.minValue = props.maxValue = Math.round(kelvinToMired(DEFAULT_COLOR_TEMPERATURE_KELVIN));
  }
  accessory.log.debug('Set props for ColorTemperature:', props);

  service.getCharacteristic(accessory.Characteristic.ColorTemperature)
    .onGet(() => {
      if (lightType === LightType.RGBC) {
        return props.minValue;
      }

      // const schema = accessory.getSchema(...SCHEMA_CODE.COLOR_TEMP)!;
      const { min, max } = tempSchema.property as TuyaDeviceSchemaIntegerProperty;
      const status = accessory.getStatus(tempSchema.code)!;
      const kelvin = remap(status.value as number, min, max, miredToKelvin(props.maxValue), miredToKelvin(props.minValue));
      const mired = Math.round(kelvinToMired(kelvin));
      return limit(mired, props.minValue, props.maxValue);
    })
    .onSet((value) => {
      accessory.log.debug(`Characteristic.ColorTemperature set to: ${value}`);

      const commands: TuyaDeviceStatus[] = [];
      if (modeSchema) {
        commands.push({ code: modeSchema.code, value: 'white' });
      }

      if (lightType !== LightType.RGBC) {
        const { min, max } = tempSchema.property as TuyaDeviceSchemaIntegerProperty;
        const kelvin = miredToKelvin(value as number);
        const temp = Math.round(remap(kelvin, miredToKelvin(props.maxValue), miredToKelvin(props.minValue), min, max));
        commands.push({ code: tempSchema.code, value: temp });
      }

      accessory.sendCommands(commands, true);
    })
    .setProps(props);

}

function configureHue(
  accessory: BaseAccessory,
  service: Service,
  lightType: LightType,
  colorSchema: TuyaDeviceSchema,
  modeSchema?: TuyaDeviceSchema,
) {
  const { min, max } = (colorSchema.property as TuyaDeviceSchemaColorProperty).h;
  service.getCharacteristic(accessory.Characteristic.Hue)
    .onGet(() => {
      if (inWhiteMode(accessory, lightType, modeSchema)) {
        return kelvinToHSV(DEFAULT_COLOR_TEMPERATURE_KELVIN)!.h;
      }

      const hue = Math.round(360 * getColorValue(accessory, colorSchema).h / max);
      return limit(hue, 0, 360);
    })
    .onSet((value) => {
      accessory.log.debug(`Characteristic.Hue set to: ${value}`);
      const colorValue = getColorValue(accessory, colorSchema);
      colorValue.h = Math.round(value as number * max / 360);
      colorValue.h = limit(colorValue.h, min, max);
      const commands: TuyaDeviceStatus[] = [{
        code: colorSchema.code,
        value: JSON.stringify(colorValue),
      }];

      if (modeSchema) {
        commands.push({ code: modeSchema.code, value: 'colour' });
      }

      accessory.sendCommands(commands, true);
    });
}

function configureSaturation(
  accessory: BaseAccessory,
  service: Service,
  lightType: LightType,
  colorSchema: TuyaDeviceSchema,
  modeSchema?: TuyaDeviceSchema,
) {
  const { min, max } = (colorSchema.property as TuyaDeviceSchemaColorProperty).s;
  service.getCharacteristic(accessory.Characteristic.Saturation)
    .onGet(() => {
      if (inWhiteMode(accessory, lightType, modeSchema)) {
        return kelvinToHSV(DEFAULT_COLOR_TEMPERATURE_KELVIN)!.s;
      }

      const saturation = Math.round(100 * getColorValue(accessory, colorSchema).s / max);
      return limit(saturation, 0, 100);
    })
    .onSet((value) => {
      accessory.log.debug(`Characteristic.Saturation set to: ${value}`);
      const colorValue = getColorValue(accessory, colorSchema);
      colorValue.s = Math.round(value as number * max / 100);
      colorValue.s = limit(colorValue.s, min, max);
      const commands: TuyaDeviceStatus[] = [{
        code: colorSchema.code,
        value: JSON.stringify(colorValue),
      }];

      if (modeSchema) {
        commands.push({ code: modeSchema.code, value: 'colour' });
      }

      accessory.sendCommands(commands, true);
    });
}

export function configureLight(
  accessory: BaseAccessory,
  service?: Service,
  onSchema?: TuyaDeviceSchema,
  brightSchema?: TuyaDeviceSchema,
  tempSchema?: TuyaDeviceSchema,
  colorSchema?: TuyaDeviceSchema,
  modeSchema?: TuyaDeviceSchema,
) {
  if (!onSchema) {
    return;
  }

  if (!service) {
    service = accessory.accessory.getService(accessory.Service.Lightbulb)
      || accessory.accessory.addService(accessory.Service.Lightbulb, accessory.accessory.displayName + ' Light');
  }

  const lightType = getLightType(accessory, onSchema, brightSchema, tempSchema, colorSchema, modeSchema);
  accessory.log.info('Light type:', lightType);

  switch (lightType) {
    case LightType.Normal:
      configureOn(accessory, service, onSchema);
      break;
    case LightType.C:
      configureOn(accessory, service, onSchema);
      configureBrightness(accessory, service, lightType, brightSchema, colorSchema, modeSchema);
      break;
    case LightType.CW:
      configureOn(accessory, service, onSchema);
      configureBrightness(accessory, service, lightType, brightSchema, colorSchema, modeSchema);
      configureColourTemperature(accessory, service, lightType, tempSchema!, modeSchema);
      break;
    case LightType.RGB:
      configureOn(accessory, service, onSchema);
      configureBrightness(accessory, service, lightType, brightSchema, colorSchema, modeSchema);
      configureHue(accessory, service, lightType, colorSchema!, modeSchema);
      configureSaturation(accessory, service, lightType, colorSchema!, modeSchema);
      break;
    case LightType.RGBC:
    case LightType.RGBCW:
      configureOn(accessory, service, onSchema);
      configureBrightness(accessory, service, lightType, brightSchema, colorSchema, modeSchema);
      configureColourTemperature(accessory, service, lightType, tempSchema!, modeSchema);
      configureHue(accessory, service, lightType, colorSchema!, modeSchema);
      configureSaturation(accessory, service, lightType, colorSchema!, modeSchema);
      break;
  }

  // Adaptive Lighting
  if (brightSchema && tempSchema) {
    const { AdaptiveLightingController } = accessory.platform.api.hap;
    const controller = new AdaptiveLightingController(service);
    accessory.accessory.configureController(controller);
    accessory.adaptiveLightingController = controller;
  }

}
