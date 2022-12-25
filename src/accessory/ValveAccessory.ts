import { TuyaDeviceSchema, TuyaDeviceSchemaType } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';
import { configureActive } from './characteristic/Active';

const SCHEMA_CODE = {
  ON: ['switch', 'switch_1'],
};

export default class ValveAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ON];
  }

  configureServices(): void {
    const oldService = this.accessory.getService(this.Service.Valve);
    if (oldService && oldService?.subtype === undefined) {
      this.platform.log.warn('Remove old service:', oldService.UUID);
      this.accessory.removeService(oldService);
    }

    const schema = this.device.schema.filter((schema) => schema.code.startsWith('switch') && schema.type === TuyaDeviceSchemaType.Boolean);
    for (const _schema of schema) {
      const name = (schema.length === 1) ? this.device.name : _schema.code;
      this.configureValve(_schema, name);
    }
  }


  configureValve(schema: TuyaDeviceSchema, name: string) {

    const service = this.accessory.getService(schema.code)
      || this.accessory.addService(this.Service.Valve, name, schema.code);

    service.setCharacteristic(this.Characteristic.Name, name);
    if (!service.testCharacteristic(this.Characteristic.ConfiguredName)) {
      service.addOptionalCharacteristic(this.Characteristic.ConfiguredName); // silence warning
      service.setCharacteristic(this.Characteristic.ConfiguredName, name);
    }
    service.setCharacteristic(this.Characteristic.ValveType, this.Characteristic.ValveType.IRRIGATION);

    const { NOT_IN_USE, IN_USE } = this.Characteristic.InUse;
    service.getCharacteristic(this.Characteristic.InUse)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return status.value ? IN_USE : NOT_IN_USE;
      });

    configureActive(this, service, schema);

  }

}
