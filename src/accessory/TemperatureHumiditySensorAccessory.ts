import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';
import { configureCurrentRelativeHumidity } from './characteristic/CurrentRelativeHumidity';
import { configureCurrentTemperature } from './characteristic/CurrentTemperature';

const SCHEMA_CODE = {
  SENSOR_STATUS: ['va_temperature', 'va_humidity', 'humidity_value'],
  CURRENT_TEMP: ['va_temperature'],
  CURRENT_HUMIDITY: ['va_humidity', 'humidity_value'],
};

export default class TemperatureHumiditySensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    configureCurrentTemperature(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));
    configureCurrentRelativeHumidity(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_HUMIDITY));
  }

  requiredSchema() {
    return [SCHEMA_CODE.SENSOR_STATUS];
  }

}
