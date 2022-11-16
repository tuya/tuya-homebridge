import { TuyaDeviceSchema, TuyaDeviceSchemaType } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';

export default class SwitchAccessory extends BaseAccessory {

  mainService() {
    return this.Service.Switch;
  }

  configureService(schema: TuyaDeviceSchema) {
    if (schema.type !== TuyaDeviceSchemaType.Boolean) {
      return;
    }

    const service = this.accessory.getService(schema.code)
      || this.accessory.addService(this.mainService(), schema.code, schema.code);

    service.setCharacteristic(this.Characteristic.Name, schema.code);
    if (!service.testCharacteristic(this.Characteristic.ConfiguredName)) {
      service.addOptionalCharacteristic(this.Characteristic.ConfiguredName); // silence warning
      service.setCharacteristic(this.Characteristic.ConfiguredName, schema.code);
    }

    service.getCharacteristic(this.Characteristic.On)
      .onGet(async () => {
        const status = this.getStatus(schema.code);
        return status!.value as boolean;
      })
      .onSet(async (value) => {
        await this.sendCommands([{
          code: schema.code,
          value: value as boolean,
        }]);
      });
  }

}
