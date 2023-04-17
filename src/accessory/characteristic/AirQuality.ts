import { Service } from 'homebridge';
import { TuyaDeviceSchema, TuyaDeviceSchemaType } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';
import { limit } from '../../util/util';

export function configureAirQuality(
  accessory: BaseAccessory,
  service?: Service,
  airQualitySchema?: TuyaDeviceSchema,
  pm2_5Schema?: TuyaDeviceSchema,
  pm10Schema?: TuyaDeviceSchema,
  vocSchema?: TuyaDeviceSchema,
) {
  if (!airQualitySchema) {
    return;
  }

  if (!service) {
    service = accessory.accessory.getService(accessory.Service.AirQualitySensor)
      || accessory.accessory.addService(accessory.Service.AirQualitySensor);
  }

  const { UNKNOWN, EXCELLENT, GOOD, FAIR, INFERIOR, POOR } = accessory.Characteristic.AirQuality;
  service.getCharacteristic(accessory.Characteristic.AirQuality)
    .onGet(() => {
      const status = accessory.getStatus(airQualitySchema.code)!;
      if (airQualitySchema.type === TuyaDeviceSchemaType.Integer) {
        const value = limit(status.value as number, 0, 1000);
        if (value <= 10) {
          return EXCELLENT;
        } else if (value <= 50) {
          return GOOD;
        } else if (value <= 100) {
          return FAIR;
        } else if (value <= 200) {
          return INFERIOR;
        } else {
          return POOR;
        }
      } else if (airQualitySchema.type === TuyaDeviceSchemaType.Enum) {
        if (status.value === 'great') {
          return EXCELLENT;
        } else if (status.value === 'good') {
          return GOOD;
        } else if (status.value === 'mild') {
          return FAIR;
        } else if (status.value === 'medium') {
          return INFERIOR;
        } else if (status.value === 'severe') {
          return POOR;
        }
      }

      return UNKNOWN;
    });

  pm2_5Schema && configureDensity(accessory, service, accessory.Characteristic.PM2_5Density, pm2_5Schema);
  pm10Schema && configureDensity(accessory, service, accessory.Characteristic.PM10Density, pm10Schema);
  vocSchema && configureDensity(accessory, service, accessory.Characteristic.VOCDensity, vocSchema);
}

function configureDensity(
  accessory: BaseAccessory,
  service: Service,
  characteristic,
  schema?: TuyaDeviceSchema,
) {
  if (!schema) {
    return;
  }

  service.getCharacteristic(characteristic)
    .onGet(() => {
      const status = accessory.getStatus(schema.code)!;
      const value = limit(status.value as number, 0, 1000);
      return value;
    });
}
