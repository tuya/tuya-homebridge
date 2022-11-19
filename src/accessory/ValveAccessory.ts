import { TuyaDeviceSchema, TuyaDeviceSchemaType } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  ON: ['switch', 'switch_1'],
};

export default class ValveAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ON];
  }

  configureService(schema: TuyaDeviceSchema) {
    if (!schema.code.startsWith('switch')
      || schema.type !== TuyaDeviceSchemaType.Boolean) {
      return;
    }

    let name = this.device.name;
    if (schema.code !== 'switch') {
      name += ` - ${schema.code.replace('switch_', '')}`;
    }

    const service = this.accessory.getService(schema.code)
      || this.accessory.addService(this.Service.Valve, name, schema.code);

    service.setCharacteristic(this.Characteristic.Name, name);
    if (!service.testCharacteristic(this.Characteristic.ConfiguredName)) {
      service.addOptionalCharacteristic(this.Characteristic.ConfiguredName); // silence warning
      service.setCharacteristic(this.Characteristic.ConfiguredName, name);
    }
    service.setCharacteristic(this.Characteristic.ValveType, this.Characteristic.ValveType.IRRIGATION);

    service.getCharacteristic(this.Characteristic.InUse)
      .onGet(() => {
        const status = this.getStatus(schema.code);
        return status?.value as boolean;
      });

    service.getCharacteristic(this.Characteristic.Active)
      .onGet(() => {
        const status = this.getStatus(schema.code);
        return status?.value as boolean;
      })
      .onSet(value => {
        this.sendCommands([{
          code: schema.code,
          value: (value as number === 1) ? true : false,
        }]);
      });
  }

}
