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
  totalSchema?: TuyaDeviceSchema,
) {

  if (currentSchema) {
    const amperes = createAmperesCharacteristic(api);
    if (!service.testCharacteristic(amperes)) {
      service.addCharacteristic(amperes).onGet(
        createStatusGetter(accessory, currentSchema, isUnit(currentSchema, 'mA') ? 1000 : 0),
      );
    }
  }

  if (powerSchema) {
    const watts = createWattsCharacteristic(api);
    if (!service.testCharacteristic(watts)) {
      service.addCharacteristic(watts).onGet(createStatusGetter(accessory, powerSchema));
    }
  }

  if (voltageSchema) {
    const volts = createVoltsCharacteristic(api);
    if (!service.testCharacteristic(volts)) {
      service.addCharacteristic(volts).onGet(createStatusGetter(accessory, voltageSchema));
    }
  }

  if (totalSchema) {
    const kwh = createKilowattHourCharacteristic(api);
    if (!service.testCharacteristic(kwh)) {
      service.addCharacteristic(kwh).onGet(createStatusGetter(accessory, totalSchema));
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

function createKilowattHourCharacteristic(api: API) {
  return class KilowattHour extends api.hap.Characteristic {
    static readonly UUID = 'E863F10C-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Total Consumption', KilowattHour.UUID, {
        format: api.hap.Formats.FLOAT,
        perms: [api.hap.Perms.NOTIFY, api.hap.Perms.PAIRED_READ],
        unit: 'kWh',
      });
    }
  };
}
