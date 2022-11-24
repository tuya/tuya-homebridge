import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import { TuyaDeviceSchemaIntegerProperty } from '../device/TuyaDevice';
import { remap } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureActive } from './characteristic/Active';
import { configureCurrentTemperature } from './characteristic/CurrentTemperature';
import { configureCurrentRelativeHumidity } from './characteristic/CurrentRelativeHumidity';
import { configureOn } from './characteristic/On';

const SCHEMA_CODE = {
  ACTIVE: ['switch'],
  CURRENT_HUMIDITY: ['humidity_current'],
  TARGET_HUMIDITY: ['humidity_set'],
  CURRENT_TEMP: ['temp_current'],
};

export default class HumidifierAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    configureActive(this, this.mainService(), this.getSchema(...SCHEMA_CODE.ACTIVE));
    this.configureTargetState();
    this.configureCurrentState();
    configureCurrentRelativeHumidity(this, this.mainService(), this.getSchema(...SCHEMA_CODE.CURRENT_HUMIDITY));
    this.configureRelativeHumidityHumidifierThreshold();
    configureCurrentTemperature(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));
    this.configureRotationSpeed();
  }

  requiredSchema() {
    return [SCHEMA_CODE.ACTIVE];
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

    this.mainService().getCharacteristic(this.Characteristic.RelativeHumidityHumidifierThreshold)
      .onGet(() => {
        const status = this.getStatus(schema.code);
        let humidity_set = status?.value as number / multiple;
        humidity_set = Math.max(0, humidity_set);
        humidity_set = Math.min(100, humidity_set);
        return humidity_set;
      })
      .onSet(value => {
        let humidity_set = value as number * multiple;
        humidity_set = Math.max(property['min'], humidity_set);
        humidity_set = Math.min(property['max'], humidity_set);
        this.sendCommands([{ code: schema.code, value: humidity_set }]);
        // also set spray mode to humidity
        this.setSprayModeToHumidity();
      }).setProps({ minStep: property['step'] });
  }


  configureRotationSpeed() {
    const schema = this.getSchema('mode');
    if (!schema) {
      this.log.warn('Mode setting is not supported.');
      return;
    }

    const service = this.accessory.getService(this.Service.Fan)
      || this.accessory.addService(this.Service.Fan);

    service.setCharacteristic(this.Characteristic.Name, 'Mode');
    configureOn(this, service, this.getSchema(...SCHEMA_CODE.ACTIVE));
    // const service = this.mainService();

    service.getCharacteristic(this.Characteristic.RotationSpeed)
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
