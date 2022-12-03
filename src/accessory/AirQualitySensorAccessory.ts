import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  PM2_5: ['pm25_value'],
  PM10: ['pm10_value'],
  VOC: ['voc_value'],
};

export default class AirQualitySensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    this.configureAirQuality();
    this.configurePM2_5Density();
    this.configurePM10Density();
    this.configureVOCDensity();
  }

  requiredSchema() {
    return [SCHEMA_CODE.PM2_5];
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
