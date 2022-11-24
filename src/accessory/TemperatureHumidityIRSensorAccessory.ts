import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';
import { configureHumiditySensor } from './TemperatureHumiditySensorAccessory/configureHumiditySensor';
import { configureTemperatureSensor } from './TemperatureHumiditySensorAccessory/configureTemperatureSensor';


export default class TemperatureHumidityIRSensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    configureTemperatureSensor(this);
    configureHumiditySensor(this);
  }

  requiredSchema() {
    return [];
  }



}
