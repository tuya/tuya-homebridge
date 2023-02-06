import { TuyaDeviceSchemaEnumProperty, TuyaDeviceSchemaIntegerProperty, TuyaDeviceStatus } from '../device/TuyaDevice';
import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureCurrentRelativeHumidity } from './characteristic/CurrentRelativeHumidity';
import { configureCurrentTemperature } from './characteristic/CurrentTemperature';
import { configureLockPhysicalControls } from './characteristic/LockPhysicalControls';
import { configureRelativeHumidityDehumidifierThreshold } from './characteristic/RelativeHumidityDehumidifierThreshold';
import { configureRotationSpeedLevel } from './characteristic/RotationSpeed';
// import { configureSwingMode } from './characteristic/SwingMode';
import { configureTempDisplayUnits } from './characteristic/TemperatureDisplayUnits';

const SCHEMA_CODE = {
  // AirConditioner
  ACTIVE: ['switch'],
  MODE: ['mode'],
  WORK_STATE: ['work_status', 'mode'],
  CURRENT_TEMP: ['temp_current'],
  TARGET_TEMP: ['temp_set'],
  SPEED_LEVEL: ['fan_speed_enum', 'windspeed'],
  LOCK: ['lock', 'child_lock'],
  TEMP_UNIT_CONVERT: ['temp_unit_convert', 'c_f'],
  SWING: ['switch_horizontal', 'switch_vertical'],
  // Dehumidifier
  CURRENT_HUMIDITY: ['humidity_current'],
  TARGET_HUMIDITY: ['humidity_set'],
};

const AC_MODES = ['auto', 'cold', 'hot'];
const DEHUMIDIFIER_MODE = 'wet';
const FAN_MODE = 'wind';

export default class AirConditionerAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ACTIVE, SCHEMA_CODE.MODE, SCHEMA_CODE.WORK_STATE, SCHEMA_CODE.CURRENT_TEMP];
  }

  configureServices() {
    this.configureAirConditioner();
    this.configureDehumidifier();
    this.configureFan();

    // Add extra sensors for home automation use.
    configureCurrentTemperature(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));
    configureCurrentRelativeHumidity(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_HUMIDITY));
  }

  configureAirConditioner() {
    const activeSchema = this.getSchema(...SCHEMA_CODE.ACTIVE)!;
    const modeSchema = this.getSchema(...SCHEMA_CODE.MODE)!;
    const modeProperty = modeSchema.property as TuyaDeviceSchemaEnumProperty;

    const service = this.mainService();

    // Required Characteristics
    const { INACTIVE, ACTIVE } = this.Characteristic.Active;
    service.getCharacteristic(this.Characteristic.Active)
      .onGet(() => {
        const activeStatus = this.getStatus(activeSchema.code)!;
        const modeStatus = this.getStatus(modeSchema.code)!;
        return (activeStatus.value === true && AC_MODES.includes(modeStatus.value as string)) ? ACTIVE : INACTIVE;
      })
      .onSet(value => {
        const commands: TuyaDeviceStatus[] = [{
          code: activeSchema.code,
          value: (value === ACTIVE) ? true : false,
        }];

        const modeStatus = this.getStatus(modeSchema.code)!;
        if (!AC_MODES.includes(modeStatus.value as string)) {
          for (const mode of AC_MODES) {
            if (modeProperty.range.includes(mode)) {
              commands.push({ code: modeStatus.code, value: mode });
              break;
            }
          }
        }

        this.sendCommands(commands, true);
      });

    this.configureCurrentState();
    this.configureTargetState();
    configureCurrentTemperature(this, service, this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));

    // Optional Characteristics
    configureLockPhysicalControls(this, service, this.getSchema(...SCHEMA_CODE.LOCK));
    configureRotationSpeedLevel(this, service, this.getSchema(...SCHEMA_CODE.SPEED_LEVEL), ['auto']);
    // configureSwingMode(this, service, this.getSchema(...SCHEMA_CODE.SWING));
    this.configureCoolingThreshouldTemp();
    this.configureHeatingThreshouldTemp();
    configureTempDisplayUnits(this, service, this.getSchema(...SCHEMA_CODE.TEMP_UNIT_CONVERT));
  }

  configureDehumidifier() {
    const activeSchema = this.getSchema(...SCHEMA_CODE.ACTIVE)!;
    const modeSchema = this.getSchema(...SCHEMA_CODE.MODE)!;
    const property = modeSchema.property as TuyaDeviceSchemaEnumProperty;
    if (!property.range.includes(DEHUMIDIFIER_MODE)) {
      return;
    }

    const service = this.dehumidifierService();

    // Required Characteristics
    const { INACTIVE, ACTIVE } = this.Characteristic.Active;
    service.getCharacteristic(this.Characteristic.Active)
      .onGet(() => {
        const activeStatus = this.getStatus(activeSchema.code)!;
        const modeStatus = this.getStatus(modeSchema.code)!;
        return (activeStatus.value === true && modeStatus.value === DEHUMIDIFIER_MODE) ? ACTIVE : INACTIVE;
      })
      .onSet(value => {
        this.sendCommands([{
          code: activeSchema.code,
          value: (value === ACTIVE) ? true : false,
        }, {
          code: modeSchema.code,
          value: DEHUMIDIFIER_MODE,
        }], true);
      });

    const { DEHUMIDIFYING } = this.Characteristic.CurrentHumidifierDehumidifierState;
    service.setCharacteristic(this.Characteristic.CurrentHumidifierDehumidifierState, DEHUMIDIFYING);

    const { DEHUMIDIFIER } = this.Characteristic.TargetHumidifierDehumidifierState;
    service.getCharacteristic(this.Characteristic.TargetHumidifierDehumidifierState)
      .updateValue(DEHUMIDIFIER)
      .setProps({ validValues: [DEHUMIDIFIER] });

    if (this.getSchema(...SCHEMA_CODE.CURRENT_HUMIDITY)) {
      configureCurrentRelativeHumidity(this, service, this.getSchema(...SCHEMA_CODE.CURRENT_HUMIDITY));
    } else {
      service.setCharacteristic(this.Characteristic.CurrentRelativeHumidity, 0);
    }

    // Optional Characteristics
    configureLockPhysicalControls(this, service, this.getSchema(...SCHEMA_CODE.LOCK));
    configureRotationSpeedLevel(this, service, this.getSchema(...SCHEMA_CODE.SPEED_LEVEL), ['auto']);
    configureRelativeHumidityDehumidifierThreshold(this, service, this.getSchema(...SCHEMA_CODE.TARGET_HUMIDITY));
    // configureSwingMode(this, service, this.getSchema(...SCHEMA_CODE.SWING));
  }

  configureFan() {
    const activeSchema = this.getSchema(...SCHEMA_CODE.ACTIVE)!;
    const modeSchema = this.getSchema(...SCHEMA_CODE.MODE)!;
    const property = modeSchema.property as TuyaDeviceSchemaEnumProperty;
    if (!property.range.includes(FAN_MODE)) {
      return;
    }

    const service = this.fanService();

    // Required Characteristics
    const { INACTIVE, ACTIVE } = this.Characteristic.Active;
    service.getCharacteristic(this.Characteristic.Active)
      .onGet(() => {
        const activeStatus = this.getStatus(activeSchema.code)!;
        const modeStatus = this.getStatus(modeSchema.code)!;
        return (activeStatus.value === true && modeStatus.value === FAN_MODE) ? ACTIVE : INACTIVE;
      })
      .onSet(value => {
        this.sendCommands([{
          code: activeSchema.code,
          value: (value === ACTIVE) ? true : false,
        }, {
          code: modeSchema.code,
          value: FAN_MODE,
        }], true);
      });

    // Optional Characteristics
    configureLockPhysicalControls(this, service, this.getSchema(...SCHEMA_CODE.LOCK));
    configureRotationSpeedLevel(this, service, this.getSchema(...SCHEMA_CODE.SPEED_LEVEL), ['auto']);
    // configureSwingMode(this, service, this.getSchema(...SCHEMA_CODE.SWING));
  }

  mainService() {
    return this.accessory.getService(this.Service.HeaterCooler)
      || this.accessory.addService(this.Service.HeaterCooler);
  }

  dehumidifierService() {
    return this.accessory.getService(this.Service.HumidifierDehumidifier)
      || this.accessory.addService(this.Service.HumidifierDehumidifier, this.accessory.displayName + ' Dehumidifier');
  }

  fanService() {
    return this.accessory.getService(this.Service.Fanv2)
      || this.accessory.addService(this.Service.Fanv2, this.accessory.displayName + ' Fan');
  }

  configureCurrentState() {
    const schema = this.getSchema(...SCHEMA_CODE.WORK_STATE);
    if (!schema) {
      return;
    }

    const { INACTIVE, HEATING, COOLING } = this.Characteristic.CurrentHeaterCoolerState;
    this.mainService().getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        if (status.value === 'heating' || status.value === 'hot') {
          return HEATING;
        } else if (status.value === 'cooling' || status.value === 'cold') {
          return COOLING;
        } else {
          return INACTIVE;
        }
      });
  }

  configureTargetState() {
    const schema = this.getSchema(...SCHEMA_CODE.MODE);
    if (!schema) {
      return;
    }

    const { AUTO, HEAT, COOL } = this.Characteristic.TargetHeaterCoolerState;

    const validValues: number[] = [];
    const property = schema.property as TuyaDeviceSchemaEnumProperty;
    if (property.range.includes('auto')) {
      validValues.push(AUTO);
    }
    if (property.range.includes('hot')) {
      validValues.push(HEAT);
    }
    if (property.range.includes('cold')) {
      validValues.push(COOL);
    }

    if (validValues.length === 0) {
      this.log.warn('Invalid mode range for TargetHeaterCoolerState:', property.range);
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        if (status.value === 'hot') {
          return HEAT;
        } else if (status.value === 'cold') {
          return COOL;
        }

        return validValues.includes(AUTO) ? AUTO : validValues[0];
      })
      .onSet(value => {

        let mode: string;
        if (value === HEAT) {
          mode = 'hot';
        } else if (value === COOL) {
          mode = 'cold';
        } else {
          mode = 'auto';
        }

        this.sendCommands([{ code: schema.code, value: mode }], true);
      })
      .setProps({ validValues });
  }

  configureCoolingThreshouldTemp() {
    const schema = this.getSchema(...SCHEMA_CODE.TARGET_TEMP);
    if (!schema) {
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = Math.pow(10, property.scale);
    const props = {
      minValue: property.min / multiple,
      maxValue: property.max / multiple,
      minStep: Math.max(0.1, property.step / multiple),
    };
    this.log.debug('Set props for CoolingThresholdTemperature:', props);

    this.mainService().getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
      .onGet(() => {
        const modeSchema = this.getSchema(...SCHEMA_CODE.MODE);
        if (modeSchema && this.getStatus(modeSchema.code)!.value === 'auto') {
          return props.minValue;
        }

        const status = this.getStatus(schema.code)!;
        const temp = status.value as number / multiple;
        return limit(temp, props.minValue, props.maxValue);
      })
      .onSet(value => {
        const modeSchema = this.getSchema(...SCHEMA_CODE.MODE);
        if (modeSchema && this.getStatus(modeSchema.code)!.value === 'auto') {
          this.mainService().getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
            .updateValue(props.minValue);
          return;
        }

        this.sendCommands([{ code: schema.code, value: (value as number) * multiple}], true);
      })
      .setProps(props);
  }

  configureHeatingThreshouldTemp() {
    const schema = this.getSchema(...SCHEMA_CODE.TARGET_TEMP);
    if (!schema) {
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = Math.pow(10, property.scale);
    const props = {
      minValue: property.min / multiple,
      maxValue: property.max / multiple,
      minStep: Math.max(0.1, property.step / multiple),
    };
    this.log.debug('Set props for HeatingThresholdTemperature:', props);

    this.mainService().getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
      .onGet(() => {
        const modeSchema = this.getSchema(...SCHEMA_CODE.MODE);
        if (modeSchema && this.getStatus(modeSchema.code)!.value === 'auto') {
          return props.maxValue;
        }

        const status = this.getStatus(schema.code)!;
        const temp = status.value as number / multiple;
        return limit(temp, props.minValue, props.maxValue);
      })
      .onSet(value => {
        const modeSchema = this.getSchema(...SCHEMA_CODE.MODE);
        if (modeSchema && this.getStatus(modeSchema.code)!.value === 'auto') {
          this.mainService().getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
            .updateValue(props.maxValue);
          return;
        }

        this.sendCommands([{ code: schema.code, value: (value as number) * multiple}], true);
      })
      .setProps(props);
  }

}
