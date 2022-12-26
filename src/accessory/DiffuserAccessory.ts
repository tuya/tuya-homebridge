import { TuyaDeviceSchemaIntegerProperty, TuyaDeviceStatus } from '../device/TuyaDevice';
import { limit, remap } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureOn } from './characteristic/On';
import { configureRotationSpeedLevel } from './characteristic/RotationSpeed';

const SCHEMA_CODE = {
  ON: ['switch'],
  SPRAY_ON: ['switch_spray'],
  SPRAY_MODE: ['mode'],
  SPRAY_LEVEL: ['level'],
  LIGHT_ON: ['switch_led'],
  LIGHT_MODE: ['work_mode'],
  LIGHT_BRIGHTNESS: ['bright_value', 'bright_value_v2'],
  LIGHT_COLOR: ['colour_data_hsv'],
  SOUND_ON: ['switch_sound'],
};

export default class DiffuserAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ON, SCHEMA_CODE.SPRAY_ON];
  }

  configureServices() {
    configureOn(this, undefined, this.getSchema(...SCHEMA_CODE.ON)); // Main Switch
    this.configureAirPurifier();
    this.configureLight();
    configureOn(this, undefined, this.getSchema(...SCHEMA_CODE.SOUND_ON)); // Sound Switch
  }

  configureAirPurifier() {
    const onSchema = this.getSchema(...SCHEMA_CODE.ON)!;
    const sprayOnSchema = this.getSchema(...SCHEMA_CODE.SPRAY_ON)!;

    // Required Characteristics
    const { INACTIVE, ACTIVE } = this.Characteristic.Active;
    this.mainService().getCharacteristic(this.Characteristic.Active)
      .onGet(() => {
        return (this.getStatus(onSchema.code)!.value && this.getStatus(sprayOnSchema.code)!.value) ? ACTIVE : INACTIVE;
      })
      .onSet(value => {
        const commands = [{ code: sprayOnSchema.code, value: (value === ACTIVE) }];
        if (value === ACTIVE) {
          commands.push({ code: onSchema.code, value: true });
        }
        this.sendCommands(commands, true);
      });

    const { PURIFYING_AIR } = this.Characteristic.CurrentAirPurifierState;
    this.mainService().getCharacteristic(this.Characteristic.CurrentAirPurifierState)
      .onGet(() => {
        return (this.getStatus(onSchema.code)!.value && this.getStatus(sprayOnSchema.code)!.value) ? PURIFYING_AIR : INACTIVE;
      });

    // const { MANUAL } = this.Characteristic.TargetAirPurifierState;
    // this.mainService().getCharacteristic(this.Characteristic.TargetAirPurifierState)
    //   .setProps({ validValues: [MANUAL] });


    // Optional Characteristics
    configureRotationSpeedLevel(this, this.mainService(), this.getSchema(...SCHEMA_CODE.SPRAY_LEVEL));
  }

  configureLight() {
    const onSchema = this.getSchema(...SCHEMA_CODE.ON)!;
    const lightOnSchema = this.getSchema(...SCHEMA_CODE.LIGHT_ON);
    if (!lightOnSchema) {
      return;
    }

    this.lightService().getCharacteristic(this.Characteristic.On)
      .onGet(() => {
        return this.getStatus(onSchema.code)!.value && this.getStatus(lightOnSchema.code)!.value;
      })
      .onSet(value => {
        const commands = [{ code: lightOnSchema.code, value: value as boolean }];
        if (value) {
          commands.push({ code: onSchema.code, value: true });
        }
        this.sendCommands(commands, true);
      });
    this.configureLightBrightness();
  }

  mainService() {
    return this.accessory.getService(this.Service.AirPurifier)
      || this.accessory.addService(this.Service.AirPurifier);
  }

  lightService() {
    return this.accessory.getService(this.Service.Lightbulb)
    || this.accessory.addService(this.Service.Lightbulb, this.device.name + ' Light');
  }

  configureLightBrightness() {
    const schema = this.getSchema(...SCHEMA_CODE.LIGHT_BRIGHTNESS);
    if (!schema) {
      return;
    }

    const lightModeSchema = this.getSchema(...SCHEMA_CODE.LIGHT_MODE);

    const { min, max } = schema.property as TuyaDeviceSchemaIntegerProperty;
    this.lightService().getCharacteristic(this.Characteristic.Brightness)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const value = Math.round(remap(status.value as number, 0, max, 0, 100));
        return limit(value, 0, 100);
      })
      .onSet(value => {
        let brightness = Math.round(remap(value as number, 0, 100, 0, max));
        brightness = limit(brightness, min, max);

        const commands: TuyaDeviceStatus[] = [{
          code: schema.code,
          value: brightness,
        }];

        if (lightModeSchema) {
          commands.push({ code: lightModeSchema.code, value: 'white' });
        }
        this.sendCommands(commands, true);
      });
  }
}
