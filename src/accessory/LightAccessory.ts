import { TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaIntegerProperty, TuyaDeviceStatus } from '../device/TuyaDevice';
import { kelvinToHSV, kelvinToMired, miredToKelvin } from '../util/color';
import { limit, remap } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureOn } from './characteristic/On';
import { configureMotionDetected } from './characteristic/MotionDetected';

const SCHEMA_CODE = {
  ON: ['switch_led'],
  BRIGHTNESS: ['bright_value', 'bright_value_v2'],
  COLOR_TEMP: ['temp_value', 'temp_value_v2'],
  COLOR: ['colour_data', 'colour_data_v2'],
  WORK_MODE: ['work_mode'],
  PIR: ['pir_state'],
  PIR_ON: ['switch_pir'],
};

const DEFAULT_COLOR_TEMPERATURE_KELVIN = 6500;

enum LightAccessoryType {
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

export default class LightAccessory extends BaseAccessory {
  static readonly LightAccessoryType = LightAccessoryType;

  requiredSchema() {
    return [SCHEMA_CODE.ON];
  }

  configureServices() {
    const type = this.getAccessoryType();
    this.log.info('Light Accessory type:', type);

    switch (type) {
      case LightAccessoryType.Normal:
        configureOn(this, this.getLightService(), this.getSchema(...SCHEMA_CODE.ON));
        break;
      case LightAccessoryType.C:
        configureOn(this, this.getLightService(), this.getSchema(...SCHEMA_CODE.ON));
        this.configureBrightness();
        break;
      case LightAccessoryType.CW:
        configureOn(this, this.getLightService(), this.getSchema(...SCHEMA_CODE.ON));
        this.configureBrightness();
        this.configureColourTemperature();
        break;
      case LightAccessoryType.RGB:
        configureOn(this, this.getLightService(), this.getSchema(...SCHEMA_CODE.ON));
        this.configureBrightness();
        this.configureHue();
        this.configureSaturation();
        break;
      case LightAccessoryType.RGBC:
      case LightAccessoryType.RGBCW:
        configureOn(this, this.getLightService(), this.getSchema(...SCHEMA_CODE.ON));
        this.configureBrightness();
        this.configureColourTemperature();
        this.configureHue();
        this.configureSaturation();
        break;
    }

    this.configurePIR();
  }


  getLightService() {
    return this.accessory.getService(this.Service.Lightbulb)
    || this.accessory.addService(this.Service.Lightbulb);
  }

  getAccessoryType() {
    const on = this.getSchema(...SCHEMA_CODE.ON);
    const bright = this.getSchema(...SCHEMA_CODE.BRIGHTNESS);
    const temp = this.getSchema(...SCHEMA_CODE.COLOR_TEMP);
    const color = this.getSchema(...SCHEMA_CODE.COLOR);
    const mode = this.getSchema(...SCHEMA_CODE.WORK_MODE)?.property as TuyaDeviceSchemaEnumProperty;
    const { h, s, v } = (color?.property || {}) as never;

    let accessoryType: LightAccessoryType;
    if (on && bright && temp && h && s && v && mode && mode.range.includes('colour') && mode.range.includes('white')) {
      accessoryType = LightAccessoryType.RGBCW;
    } else if (on && bright && !temp && h && s && v && mode && mode.range.includes('colour') && mode.range.includes('white')) {
      accessoryType = LightAccessoryType.RGBC;
    } else if (on && !temp && h && s && v) {
      accessoryType = LightAccessoryType.RGB;
    } else if (on && bright && temp) {
      accessoryType = LightAccessoryType.CW;
    } else if (on && bright && !temp) {
      accessoryType = LightAccessoryType.C;
    } else if (on && !bright && !temp) {
      accessoryType = LightAccessoryType.Normal;
    } else {
      accessoryType = LightAccessoryType.Unknown;
    }

    return accessoryType;
  }

  getColorValue() {
    const schema = this.getSchema(...SCHEMA_CODE.COLOR);
    const status = this.getStatus(schema!.code);
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

  inWhiteMode() {
    const mode = this.getSchema(...SCHEMA_CODE.WORK_MODE);
    if (!mode) {
      return false;
    }
    const status = this.getStatus(mode.code);
    if (!status) {
      return false;
    }
    return (status.value === 'white');
  }

  inColorMode() {
    const mode = this.getSchema(...SCHEMA_CODE.WORK_MODE);
    if (!mode) {
      return false;
    }
    const status = this.getStatus(mode.code);
    if (!status) {
      return false;
    }
    return (status.value === 'colour');
  }

  configureBrightness() {
    const service = this.getLightService();

    service.getCharacteristic(this.Characteristic.Brightness)
      .onGet(() => {
        if (this.inColorMode()) {
          // Color mode, get brightness from `color_data.v`
          const schema = this.getSchema(...SCHEMA_CODE.COLOR)!;
          const { max } = (schema.property as TuyaDeviceSchemaColorProperty).v;
          const status = this.getColorValue().v;
          const value = Math.floor(100 * status / max);
          return limit(value, 0, 100);
        } else if (this.inWhiteMode()) {
          // White mode, get brightness from `brightness_value`
          const schema = this.getSchema(...SCHEMA_CODE.BRIGHTNESS)!;
          const { max } = schema.property as TuyaDeviceSchemaIntegerProperty;
          const status = this.getStatus(schema.code)!;
          const value = Math.floor(100 * (status.value as number) / max);
          return limit(value, 0, 100);
        } else {
          // Unsupported mode
          return 100;
        }

      })
      .onSet((value) => {
        this.log.debug(`Characteristic.Brightness set to: ${value}`);
        if (this.inColorMode()) {
          // Color mode, set brightness to `color_data.v`
          const colorSchema = this.getSchema(...SCHEMA_CODE.COLOR)!;
          const { min, max } = (colorSchema.property as TuyaDeviceSchemaColorProperty).v;
          const colorValue = this.getColorValue();
          colorValue.v = Math.floor(value as number * max / 100);
          colorValue.v = limit(colorValue.v, min, max);
          this.sendCommands([{ code: colorSchema.code, value: JSON.stringify(colorValue) }], true);
          return;
        } else if (this.inWhiteMode()) {
          // White mode, set brightness to `brightness_value`
          const brightSchema = this.getSchema(...SCHEMA_CODE.BRIGHTNESS)!;
          const { min, max } = brightSchema.property as TuyaDeviceSchemaIntegerProperty;
          let brightValue = Math.floor(value as number * max / 100);
          brightValue = limit(brightValue, min, max);
          this.sendCommands([{ code: brightSchema.code, value: brightValue }], true);
        } else {
          // Unsupported mode
        }
      });

  }

  configureColourTemperature() {
    const type = this.getAccessoryType();
    const props = { minValue: 140, maxValue: 500, minStep: 1 };

    if (type === LightAccessoryType.RGBC) {
      props.minValue = props.maxValue = Math.floor(kelvinToMired(DEFAULT_COLOR_TEMPERATURE_KELVIN));
    }
    this.log.debug('Set props for ColorTemperature:', props);

    const service = this.getLightService();
    service.getCharacteristic(this.Characteristic.ColorTemperature)
      .onGet(() => {
        if (type === LightAccessoryType.RGBC) {
          return props.minValue;
        }

        const schema = this.getSchema(...SCHEMA_CODE.COLOR_TEMP)!;
        const { min, max } = schema.property as TuyaDeviceSchemaIntegerProperty;
        const status = this.getStatus(schema.code)!;
        const kelvin = remap(status.value as number, min, max, miredToKelvin(props.maxValue), miredToKelvin(props.minValue));
        const mired = Math.floor(kelvinToMired(kelvin));
        return limit(mired, props.minValue, props.maxValue);
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.ColorTemperature set to: ${value}`);

        const commands: TuyaDeviceStatus[] = [];
        const mode = this.getSchema(...SCHEMA_CODE.WORK_MODE);
        if (mode) {
          commands.push({ code: mode.code, value: 'white' });
        }

        if (type !== LightAccessoryType.RGBC) {
          const schema = this.getSchema(...SCHEMA_CODE.COLOR_TEMP)!;
          const { min, max } = schema.property as TuyaDeviceSchemaIntegerProperty;
          const kelvin = miredToKelvin(value as number);
          const temp = Math.floor(remap(kelvin, miredToKelvin(props.maxValue), miredToKelvin(props.minValue), min, max));
          commands.push({ code: schema.code, value: temp });
        }

        this.sendCommands(commands, true);
      })
      .setProps(props);

  }

  configureHue() {
    const service = this.getLightService();
    const colorSchema = this.getSchema(...SCHEMA_CODE.COLOR)!;
    const { min, max } = (colorSchema.property as TuyaDeviceSchemaColorProperty).h;
    service.getCharacteristic(this.Characteristic.Hue)
      .onGet(() => {
        if (this.inWhiteMode()) {
          return kelvinToHSV(DEFAULT_COLOR_TEMPERATURE_KELVIN)!.h;
        }

        const hue = Math.floor(360 * this.getColorValue().h / max);
        return limit(hue, 0, 360);
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.Hue set to: ${value}`);
        const colorValue = this.getColorValue();
        colorValue.h = Math.floor(value as number * max / 360);
        colorValue.h = limit(colorValue.h, min, max);
        const commands: TuyaDeviceStatus[] = [{
          code: colorSchema.code,
          value: JSON.stringify(colorValue),
        }];

        const mode = this.getSchema(...SCHEMA_CODE.WORK_MODE);
        if (mode) {
          commands.push({ code: mode.code, value: 'colour' });
        }

        this.sendCommands(commands, true);
      });
  }

  configureSaturation() {
    const service = this.getLightService();
    const colorSchema = this.getSchema(...SCHEMA_CODE.COLOR)!;
    const { min, max } = (colorSchema.property as TuyaDeviceSchemaColorProperty).s;
    service.getCharacteristic(this.Characteristic.Saturation)
      .onGet(() => {
        if (this.inWhiteMode()) {
          return kelvinToHSV(DEFAULT_COLOR_TEMPERATURE_KELVIN)!.s;
        }

        const saturation = Math.floor(100 * this.getColorValue().s / max);
        return limit(saturation, 0, 100);
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.Saturation set to: ${value}`);
        const colorValue = this.getColorValue();
        colorValue.s = Math.floor(value as number * max / 100);
        colorValue.s = limit(colorValue.s, min, max);
        const commands: TuyaDeviceStatus[] = [{
          code: colorSchema.code,
          value: JSON.stringify(colorValue),
        }];

        const mode = this.getSchema(...SCHEMA_CODE.WORK_MODE);
        if (mode) {
          commands.push({ code: mode.code, value: 'colour' });
        }

        this.sendCommands(commands, true);
      });
  }

  configurePIR() {
    const onSchema = this.getSchema(...SCHEMA_CODE.PIR_ON);
    if (onSchema) {
      const service = this.accessory.getService(onSchema.code)
        || this.accessory.addService(this.Service.Switch, onSchema.code, onSchema.code);
      configureOn(this, service, onSchema);
    }

    const motionSchema = this.getSchema(...SCHEMA_CODE.PIR);
    configureMotionDetected(this, undefined, motionSchema);

  }
}
