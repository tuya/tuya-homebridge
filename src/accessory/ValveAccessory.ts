import { TuyaDeviceSchema, TuyaDeviceSchemaType } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';

export default class ValveAccessory extends BaseAccessory {

  configureService(schema: TuyaDeviceSchema) {
    if (!schema.code.startsWith('switch')
      || schema.type !== TuyaDeviceSchemaType.Boolean) {
      return;
    }

    const service = this.accessory.getService(schema.code)
      || this.accessory.addService(this.Service.Valve, schema.code, schema.code);

    service.setCharacteristic(this.Characteristic.Name, schema.code);
    if (!service.testCharacteristic(this.Characteristic.ConfiguredName)) {
      service.addOptionalCharacteristic(this.Characteristic.ConfiguredName); // silence warning
      service.setCharacteristic(this.Characteristic.ConfiguredName, schema.code);
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
