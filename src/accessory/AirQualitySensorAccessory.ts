import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureCurrentRelativeHumidity } from './characteristic/CurrentRelativeHumidity';
import { configureCurrentTemperature } from './characteristic/CurrentTemperature';

const SCHEMA_CODE = {
  PM2_5: ['pm25_value'],
  PM10: ['pm10_value', 'pm10'],
  VOC: ['voc_value'],
  CURRENT_TEMP: ['va_temperature', 'temp_indoor', 'temp_current'],
  CURRENT_HUMIDITY: ['va_humidity', 'humidity_value'],
};

export default class AirQualitySensorAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.PM2_5];
  }

  configureServices() {
    this.configureAirQuality();
    this.configurePM2_5Density();
    this.configurePM10Density();
    this.configureVOCDensity();

    // Other
    configureCurrentTemperature(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));
    configureCurrentRelativeHumidity(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_HUMIDITY));
  }


  mainService() {
    return this.accessory.getService(this.Service.AirQualitySensor)
      || this.accessory.addService(this.Service.AirQualitySensor);
  }

  configureAirQuality() {
    const schema = this.getSchema(...SCHEMA_CODE.PM2_5);
    if (!schema) {
      return;
    }

    const { GOOD, FAIR, INFERIOR, POOR } = this.Characteristic.AirQuality;
    this.mainService().getCharacteristic(this.Characteristic.AirQuality)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const value = limit(status.value as number, 0, 1000);
        if (value <= 50) {
          return GOOD;
        } else if (value <= 100) {
          return FAIR;
        } else if (value <= 200) {
          return INFERIOR;
        } else {
          return POOR;
        }
      });
  }

  configurePM2_5Density() {
    const schema = this.getSchema(...SCHEMA_CODE.PM2_5);
    if (!schema) {
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.PM2_5Density)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const value = limit(status.value as number, 0, 1000);
        return value;
      });
  }

  configurePM10Density() {
    const schema = this.getSchema(...SCHEMA_CODE.PM10);
    if (!schema) {
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.PM10Density)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const value = limit(status.value as number, 0, 1000);
        return value;
      });
  }

  configureVOCDensity() {
    const schema = this.getSchema(...SCHEMA_CODE.VOC);
    if (!schema) {
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.VOCDensity)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const value = limit(status.value as number, 0, 1000);
        return value;
      });
  }
}
