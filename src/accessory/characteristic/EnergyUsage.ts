import BaseAccessory from '../BaseAccessory';
import { API, Service } from 'homebridge';
import { TuyaDeviceSchema, TuyaDeviceSchemaIntegerProperty } from '../../device/TuyaDevice';
import OverridedBaseAccessory from '../BaseAccessory';

export function configureEnergyUsage(
  api: API,
  accessory: OverridedBaseAccessory,
  service: Service,
  currentSchema?: TuyaDeviceSchema,
  powerSchema?: TuyaDeviceSchema,
  voltageSchema?: TuyaDeviceSchema,
) {

  if (currentSchema) {
    if (isUnit(currentSchema, 'A', 'mA')) {
      const amperes = createAmperesCharacteristic(api);
      if (!service.testCharacteristic(amperes)) {
        service.addCharacteristic(amperes).onGet(
          createStatusGetter(accessory, currentSchema, isUnit(currentSchema, 'mA') ? 1000 : 0),
        );
      }
    } else {
      accessory.log.warn('Unsupported current unit %p', currentSchema);
    }
  }

  if (powerSchema) {
    if (isUnit(powerSchema, 'W')) {
      const watts = createWattsCharacteristic(api);
      if (!service.testCharacteristic(watts)) {
        service.addCharacteristic(watts).onGet(createStatusGetter(accessory, powerSchema));
      }
    } else {
      accessory.log.warn('Unsupported power unit %p', currentSchema);
    }
  }

  if (voltageSchema) {
    if (isUnit(voltageSchema, 'V')) {
      const volts = createVoltsCharacteristic(api);
      if (!service.testCharacteristic(volts)) {
        service.addCharacteristic(volts).onGet(createStatusGetter(accessory, voltageSchema));
      }
    } else {
      accessory.log.warn('Unsupported voltage unit %p', currentSchema);
    }
  }
}

function isUnit(schema: TuyaDeviceSchema, ...units: string[]): boolean {
  return units.includes((schema.property as TuyaDeviceSchemaIntegerProperty).unit);
}

function createStatusGetter(accessory: BaseAccessory, schema: TuyaDeviceSchema, divisor = 1): () => number {
  const property = schema.property as TuyaDeviceSchemaIntegerProperty;
  divisor *= Math.pow(10, property.scale);
  return () => {
    const status = accessory.getStatus(schema.code)!;

    return (status.value as number) / divisor;
  };
}

function createAmperesCharacteristic(api: API) {
  return class Amperes extends api.hap.Characteristic {
    static readonly UUID = 'E863F126-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Amperes', Amperes.UUID, {
        format: api.hap.Formats.FLOAT,
        perms: [api.hap.Perms.NOTIFY, api.hap.Perms.PAIRED_READ],
        unit: 'A',
      });
    }
  };
}

function createWattsCharacteristic(api: API) {
  return class Watts extends api.hap.Characteristic {
    static readonly UUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Consumption', Watts.UUID, {
        format: api.hap.Formats.FLOAT,
        perms: [api.hap.Perms.NOTIFY, api.hap.Perms.PAIRED_READ],
        unit: 'W',
      });
    }
  };
}

function createVoltsCharacteristic(api: API) {
  return class Volts extends api.hap.Characteristic {
    static readonly UUID = 'E863F10A-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Volts', Volts.UUID, {
        format: api.hap.Formats.FLOAT,
        perms: [api.hap.Perms.NOTIFY, api.hap.Perms.PAIRED_READ],
        unit: 'V',
      });
    }
  };
}
