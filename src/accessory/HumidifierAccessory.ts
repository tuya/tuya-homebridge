import { TuyaDeviceSchemaIntegerProperty } from '../device/TuyaDevice';
import { limit, remap } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureActive } from './characteristic/Active';
import { configureCurrentTemperature } from './characteristic/CurrentTemperature';
import { configureCurrentRelativeHumidity } from './characteristic/CurrentRelativeHumidity';
import { configureLight } from './characteristic/Light';

const SCHEMA_CODE = {
  ACTIVE: ['switch'],
  CURRENT_HUMIDITY: ['humidity_current'],
  TARGET_HUMIDITY: ['humidity_set'],
  CURRENT_TEMP: ['temp_current'],
  LIGHT_ON: ['switch_led'],
  LIGHT_MODE: ['work_mode'],
  LIGHT_BRIGHT: ['bright_value', 'bright_value_v2'],
  LIGHT_COLOR: ['colour_data', 'colour_data_hsv'],
};

export default class HumidifierAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ACTIVE];
  }

  configureServices() {
    // Required Characteristics
    configureActive(this, this.mainService(), this.getSchema(...SCHEMA_CODE.ACTIVE));
    this.configureCurrentState();
    this.configureTargetState();
    configureCurrentRelativeHumidity(this, this.mainService(), this.getSchema(...SCHEMA_CODE.CURRENT_HUMIDITY));

    // Optional Characteristics
    this.configureRelativeHumidityHumidifierThreshold();
    this.configureRotationSpeed();

    // Other
    configureCurrentTemperature(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));
    configureLight(
      this,
      undefined,
      this.getSchema(...SCHEMA_CODE.LIGHT_ON),
      this.getSchema(...SCHEMA_CODE.LIGHT_BRIGHT),
      undefined,
      this.getSchema(...SCHEMA_CODE.LIGHT_COLOR),
      this.getSchema(...SCHEMA_CODE.LIGHT_MODE),
    );
  }


  mainService() {
    return this.accessory.getService(this.Service.HumidifierDehumidifier)
      || this.accessory.addService(this.Service.HumidifierDehumidifier);
  }


  configureTargetState() {
    const { HUMIDIFIER } = this.Characteristic.TargetHumidifierDehumidifierState;
    const validValues = [HUMIDIFIER];

    this.mainService().getCharacteristic(this.Characteristic.TargetHumidifierDehumidifierState)
      .onGet(() => {
        return HUMIDIFIER;
      }).setProps({ validValues });
  }

  configureCurrentState() {
    const schema = this.getSchema(...SCHEMA_CODE.ACTIVE);
    if (!schema) {
      this.log.warn('CurrentHumidifierDehumidifierState not supported.');
      return;
    }

    const { INACTIVE, HUMIDIFYING } = this.Characteristic.CurrentHumidifierDehumidifierState;

    this.mainService().getCharacteristic(this.Characteristic.CurrentHumidifierDehumidifierState)
      .onGet(() => {
        const status = this.getStatus(schema.code);
        return (status?.value as boolean) ? HUMIDIFYING : INACTIVE;
      });
  }

  configureRelativeHumidityHumidifierThreshold() {
    const schema = this.getSchema(...SCHEMA_CODE.TARGET_HUMIDITY);
    if (!schema) {
      this.log.warn('Humidity setting is not supported.');
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = Math.pow(10, property ? property.scale : 0);
    const props = {
      minValue: 0,
      maxValue: 100,
      minStep: Math.max(1, property.step / multiple),
    };
    this.log.debug('Set props for RelativeHumidityHumidifierThreshold:', props);

    this.mainService().getCharacteristic(this.Characteristic.RelativeHumidityHumidifierThreshold)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return limit(status.value as number / multiple, 0, 100);
      })
      .onSet(value => {
        const humidity_set = limit(value as number * multiple, property.min, property.max);
        this.sendCommands([{ code: schema.code, value: humidity_set }]);
        // also set spray mode to humidity
        this.setSprayModeToHumidity();
      }).setProps(props);
  }


  configureRotationSpeed() {
    const schema = this.getSchema('mode');
    if (!schema) {
      this.log.warn('Mode setting is not supported.');
      return;
    }

    const unusedService = this.accessory.getService(this.Service.Fan);
    unusedService && this.accessory.removeService(unusedService);

    this.mainService().getCharacteristic(this.Characteristic.RotationSpeed)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        let v = 3;
        switch (status.value as string) {
          case 'small':
            v = 1;
            break;
          case 'middle':
            v = 2;
            break;
        }
        return remap(v, 0, 3, 0, 100);
      }).onSet(v => {
        v = Math.round(remap(v as number, 0, 100, 0, 3));
        let mode = 'small';
        switch (v) {
          case 2:
            mode = 'middle';
            break;
          case 3:
            mode = 'large';
            break;
        }
        this.sendCommands([{ code: schema.code, value: mode }]);
      });
  }

  setSprayModeToHumidity() {
    const schema = this.getSchema('spray_mode');
    if (!schema) {
      this.log.debug('Spray mode not supported.');
      return;
    }
    this.sendCommands([{ code: schema.code, value: 'humidity' }]);
  }

}
