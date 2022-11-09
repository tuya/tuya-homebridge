import { PlatformAccessory } from 'homebridge';
import { TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaIntegerProperty, TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

enum LightAccessoryType {
  Unknown = -1,
  Normal = 0, // Normal Accessory, similar to SwitchAccessory, OutletAccessory.
  C = 1, // Accessory with brightness.
  CW = 2, // Accessory with brightness and color temperature (Cold and Warm).
  RGB = 3, // Accessory with color (RGB <--> HSB).
  RGBC = 4, // Accessory with color and brightness.
  RGBCW = 5, // Accessory with color, brightness and color temperature (two work mode).
}

type TuyaDeviceSchemaColorProperty = {
  h: TuyaDeviceSchemaIntegerProperty;
  s: TuyaDeviceSchemaIntegerProperty;
  v: TuyaDeviceSchemaIntegerProperty;
};

export default class LightAccessory extends BaseAccessory {
  static readonly LightAccessoryType = LightAccessoryType;

  constructor(
    public readonly platform: TuyaPlatform,
    public readonly accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // platform.log.debug(`${JSON.stringify(this.device.functions)}, ${JSON.stringify(this.device.status)}`);
    switch (this.getAccessoryType()) {
      case LightAccessoryType.Normal:
        this.configureOn();
        break;
      case LightAccessoryType.C:
        this.configureOn();
        this.configureBrightness();
        break;
      case LightAccessoryType.CW:
        this.configureOn();
        this.configureBrightness();
        this.configureColourTemperature();
        break;
      case LightAccessoryType.RGB:
        this.configureOn();
        this.configureBrightness();
        this.configureHue();
        this.configureSaturation();
        break;
      case LightAccessoryType.RGBC:
      case LightAccessoryType.RGBCW:
        this.configureOn();
        this.configureBrightness();
        this.configureColourTemperature();
        this.configureHue();
        this.configureSaturation();
        break;
    }
  }

  getLightService() {
    return this.accessory.getService(this.Service.Lightbulb)
    || this.accessory.addService(this.Service.Lightbulb);
  }

  getAccessoryType() {
    const on = this.getOnSchema();
    const bright = this.getBrightnessSchema();
    const temp = this.getColorTemperatureSchema();
    const color = this.getColorSchema();
    const mode = this.getWorkModeSchema()?.property as TuyaDeviceSchemaEnumProperty;
    const { h, s, v } = (color?.property || {}) as never;

    let accessoryType: LightAccessoryType;
    if (on && bright && temp && h && s && v && mode && mode.range.includes('colour') && mode.range.includes('white')) {
      accessoryType = LightAccessoryType.RGBCW;
    } else if (on && bright && !temp && h && s && v && mode && mode.range.includes('colour') && mode.range.includes('white')) {
      accessoryType = LightAccessoryType.RGBC;
    } else if (on && !temp && h && s && v) {
      accessoryType = LightAccessoryType.RGB;
    } else if (on && bright && temp && !color) {
      accessoryType = LightAccessoryType.CW;
    } else if (on && bright && !temp && !color) {
      accessoryType = LightAccessoryType.C;
    } else if (on && !bright && !temp && !color) {
      accessoryType = LightAccessoryType.Normal;
    } else {
      accessoryType = LightAccessoryType.Unknown;
    }

    return accessoryType;
  }

  getOnSchema() {
    return this.getSchema('switch_led')
    || this.getSchema('switch_led_1');
  }

  getBrightnessSchema() {
    return this.getSchema('bright_value')
      || this.getSchema('bright_value_v2')
      || this.getSchema('bright_value_1');
  }

  getColorTemperatureSchema() {
    return this.getSchema('temp_value')
      || this.getSchema('temp_value_v2');
  }

  getColorSchema() {
    return this.getSchema('colour_data')
      || this.getSchema('colour_data_v2');
  }

  getWorkModeSchema() {
    return this.getSchema('work_mode');
  }

  getColorValue() {
    const schema = this.getColorSchema();
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
    const mode = this.getWorkModeSchema();
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
    const mode = this.getWorkModeSchema();
    if (!mode) {
      return false;
    }
    const status = this.getStatus(mode.code);
    if (!status) {
      return false;
    }
    return (status.value === 'colour');
  }

  configureOn() {
    const service = this.getLightService();
    const schema = this.getOnSchema()!;

    service.getCharacteristic(this.Characteristic.On)
      .onGet(() => {
        const status = this.getStatus(schema.code);
        return !!status && status!.value;
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.On set to: ${value}`);
        this.sendCommands([{ code: schema.code, value: value as boolean }], true);
      });
  }

  configureBrightness() {
    const service = this.getLightService();

    service.getCharacteristic(this.Characteristic.Brightness)
      .onGet(() => {

        // Color mode, get brightness from hsv
        if (this.inColorMode()) {
          const { max } = (this.getColorSchema()?.property as TuyaDeviceSchemaColorProperty).v;
          const status = this.getColorValue().v;
          let value = Math.floor(100 * status / max);
          value = Math.max(0, value);
          value = Math.min(100, value);
          return value;
        }

        const schema = this.getBrightnessSchema()!;
        const { max } = schema.property as TuyaDeviceSchemaIntegerProperty;
        const status = this.getStatus(schema.code)!;
        let value = Math.floor(100 * (status.value as number) / max);
        value = Math.max(0, value);
        value = Math.min(100, value);
        return value;
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.Brightness set to: ${value}`);

        // Color mode, set brightness to hsv
        if (this.inColorMode()) {
          const { max } = (this.getColorSchema()?.property as TuyaDeviceSchemaColorProperty).v;
          const colorSchema = this.getColorSchema()!;
          const colorValue = this.getColorValue();
          colorValue.v = Math.floor(value as number * max / 100);
          this.sendCommands([{ code: colorSchema.code, value: JSON.stringify(colorValue) }], true);
          return;
        }

        const brightSchema = this.getBrightnessSchema()!;
        const { max } = brightSchema.property as TuyaDeviceSchemaIntegerProperty;
        const brightValue = Math.floor(value as number * max / 100);
        this.sendCommands([{ code: brightSchema.code, value: brightValue }], true);
      });

  }

  configureColourTemperature() {
    const type = this.getAccessoryType();
    const props = { minValue: 140, maxValue: 500, minStep: 1 };

    const service = this.getLightService();
    service.getCharacteristic(this.Characteristic.ColorTemperature)
      .onGet(() => {
        if (type === LightAccessoryType.RGBC) {
          return 153;
        }

        const schema = this.getColorTemperatureSchema()!;
        const { min, max } = schema.property as TuyaDeviceSchemaIntegerProperty;
        const status = this.getStatus(schema.code)!;
        let miredValue = Math.floor(1000000 / ((status.value as number - min) * (7142 - 2000) / (max - min) + 2000));
        miredValue = Math.max(140, miredValue);
        miredValue = Math.min(500, miredValue);
        return miredValue;
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.ColorTemperature set to: ${value}`);

        const commands: TuyaDeviceStatus[] = [];
        const mode = this.getWorkModeSchema();
        if (mode) {
          commands.push({ code: mode.code, value: 'white' });
        }

        if (type !== LightAccessoryType.RGBC) {
          const schema = this.getColorTemperatureSchema()!;
          const { min, max } = schema.property as TuyaDeviceSchemaIntegerProperty;
          const temp = Math.floor((1000000 / (value as number) - 2000) * (max - min) / (7142 - 2000) + min);
          commands.push({ code: schema.code, value: temp });
        }

        this.sendCommands(commands, true);
      })
      .setProps(props);

  }

  configureHue() {
    const service = this.getLightService();
    const colorSchema = this.getColorSchema()!;
    const { min, max } = (colorSchema.property as TuyaDeviceSchemaColorProperty).h;
    service.getCharacteristic(this.Characteristic.Hue)
      .onGet(() => {
        // White mode, return fixed Hue 0
        if (this.inWhiteMode()) {
          return 0;
        }

        let hue = Math.floor(360 * (this.getColorValue().h - min) / (max - min));
        hue = Math.max(0, hue);
        hue = Math.min(360, hue);
        return hue;
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.Hue set to: ${value}`);
        const colorValue = this.getColorValue();
        colorValue.h = Math.floor((value as number / 360) * (max - min) + min);
        const commands: TuyaDeviceStatus[] = [{
          code: colorSchema.code,
          value: JSON.stringify(colorValue),
        }];

        const mode = this.getWorkModeSchema();
        if (mode) {
          commands.push({ code: mode.code, value: 'colour' });
        }

        this.sendCommands(commands, true);
      });
  }

  configureSaturation() {
    const service = this.getLightService();
    const colorSchema = this.getColorSchema()!;
    const { min, max } = (colorSchema.property as TuyaDeviceSchemaColorProperty).s;
    service.getCharacteristic(this.Characteristic.Saturation)
      .onGet(() => {
        // White mode, return fixed Saturation 0
        if (this.inWhiteMode()) {
          return 0;
        }

        let saturation = Math.floor(100 * (this.getColorValue().s - min) / (max - min));
        saturation = Math.max(0, saturation);
        saturation = Math.min(100, saturation);
        return saturation;
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.Saturation set to: ${value}`);
        const colorValue = this.getColorValue();
        colorValue.s = Math.floor((value as number / 100) * (max - min) + min);
        const commands: TuyaDeviceStatus[] = [{
          code: colorSchema.code,
          value: JSON.stringify(colorValue),
        }];

        const mode = this.getWorkModeSchema();
        if (mode) {
          commands.push({ code: mode.code, value: 'colour' });
        }

        this.sendCommands(commands, true);
      });
  }

}
