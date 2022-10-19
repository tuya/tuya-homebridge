import { TuyaDeviceFunction, TuyaDeviceFunctionType } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';

export default class SwitchAccessory extends BaseAccessory {

  mainService() {
    return this.Service.Switch;
  }

  configureService(deviceFunction: TuyaDeviceFunction) {
    if (deviceFunction.type !== TuyaDeviceFunctionType.Boolean) {
      return;
    }

    const service = this.accessory.getService(deviceFunction.code)
      || this.accessory.addService(this.mainService(), deviceFunction.name, deviceFunction.code);

    service.setCharacteristic(this.Characteristic.Name, deviceFunction.name);

    service.getCharacteristic(this.Characteristic.On)
      .onGet(async () => {
        const status = this.device.getDeviceStatus(deviceFunction.code);
        return status!.value as boolean;
      })
      .onSet(async (value) => {
        await this.deviceManager.sendCommands(this.device.id, [{
          code: deviceFunction.code,
          value: value as boolean,
        }]);
      });
  }

}
