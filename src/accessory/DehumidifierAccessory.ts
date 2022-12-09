import { TuyaDeviceSchemaIntegerProperty } from '../device/TuyaDevice';
import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureActive } from './characteristic/Active';
import { configureCurrentTemperature } from './characteristic/CurrentTemperature';
import { configureCurrentRelativeHumidity } from './characteristic/CurrentRelativeHumidity';
import { configureRotationSpeedLevel } from './characteristic/RotationSpeed';
import { configureSwingMode } from './characteristic/SwingMode';
import { configureLockPhysicalControls } from './characteristic/LockPhysicalControls';

const SCHEMA_CODE = {
  ACTIVE: ['switch'],
  CURRENT_HUMIDITY: ['humidity_indoor'],
  TARGET_HUMIDITY: ['dehumidify_set_value'],
  CURRENT_TEMP: ['temp_indoor'],
  SPEED_LEVEL: ['fan_speed_enum'],
  SWING: ['swing'],
  LOCK: ['child_lock'],
};

export default class DehumidifierAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ACTIVE, SCHEMA_CODE.CURRENT_HUMIDITY];
  }

  configureServices() {
    // Required Characteristics
    configureActive(this, this.mainService(), this.getSchema(...SCHEMA_CODE.ACTIVE));
    this.configureCurrentState();
    this.configureTargetState();
    configureCurrentRelativeHumidity(this, this.mainService(), this.getSchema(...SCHEMA_CODE.CURRENT_HUMIDITY));

    // Optional Characteristics
    configureLockPhysicalControls(this, this.mainService(), this.getSchema(...SCHEMA_CODE.LOCK));
    this.configureRelativeHumidityDehumidifierThreshold();
    configureRotationSpeedLevel(this, this.mainService(), this.getSchema(...SCHEMA_CODE.SPEED_LEVEL));
    configureSwingMode(this, this.mainService(), this.getSchema(...SCHEMA_CODE.SWING));

    // Other
    configureCurrentTemperature(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));
  }

  mainService() {
    return this.accessory.getService(this.Service.HumidifierDehumidifier)
      || this.accessory.addService(this.Service.HumidifierDehumidifier);
  }


  configureCurrentState() {
    const schema = this.getSchema(...SCHEMA_CODE.ACTIVE);
    if (!schema) {
      this.log.warn('CurrentHumidifierDehumidifierState not supported.');
      return;
    }

    const { INACTIVE, DEHUMIDIFYING } = this.Characteristic.CurrentHumidifierDehumidifierState;

    this.mainService().getCharacteristic(this.Characteristic.CurrentHumidifierDehumidifierState)
      .onGet(() => {
        const status = this.getStatus(schema.code);
        return (status?.value as boolean) ? DEHUMIDIFYING : INACTIVE;
      });
  }

  configureTargetState() {
    const { DEHUMIDIFIER } = this.Characteristic.TargetHumidifierDehumidifierState;
    const validValues = [DEHUMIDIFIER];

    this.mainService().getCharacteristic(this.Characteristic.TargetHumidifierDehumidifierState)
      .onGet(() => {
        return DEHUMIDIFIER;
      }).setProps({ validValues });
  }

  configureRelativeHumidityDehumidifierThreshold() {
    const schema = this.getSchema(...SCHEMA_CODE.TARGET_HUMIDITY);
    if (!schema) {
      this.log.warn('RelativeHumidityDehumidifierThreshold not supported.');
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = Math.pow(10, property.scale);
    const props = {
      minValue: Math.max(0, property.min / multiple),
      maxValue: Math.min(100, property.max / multiple),
      minStep: Math.max(1, property.step / multiple),
    };
    this.log.debug('Set props for RelativeHumidityDehumidifierThreshold:', props);

    this.mainService().getCharacteristic(this.Characteristic.RelativeHumidityDehumidifierThreshold)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return limit(status.value as number / multiple, props.minValue, props.maxValue);
      })
      .onSet(value => {
        const dehumidity_set = limit(value as number * multiple, property.min, property.max);
        this.sendCommands([{ code: schema.code, value: dehumidity_set }]);
      }).setProps(props);
  }

}
