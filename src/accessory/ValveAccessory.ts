import { TuyaDeviceFunction, TuyaDeviceFunctionType } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';

export default class ValueAccessory extends BaseAccessory {

  configureService(deviceFunction: TuyaDeviceFunction) {
    if (!deviceFunction.code.startsWith('switch')
      || deviceFunction.type !== TuyaDeviceFunctionType.Boolean) {
      return;
    }

    const service = this.accessory.getService(deviceFunction.code)
      || this.accessory.addService(this.Service.Valve, deviceFunction.name, deviceFunction.code);

    service.setCharacteristic(this.Characteristic.Name, deviceFunction.name);
    service.setCharacteristic(this.Characteristic.ValveType, this.Characteristic.ValveType.IRRIGATION);

    service.getCharacteristic(this.Characteristic.InUse)
      .onGet(() => {
        const status = this.device.getDeviceStatus(deviceFunction.code);
        return status?.value as boolean;
      });

    service.getCharacteristic(this.Characteristic.Active)
      .onGet(() => {
        const status = this.device.getDeviceStatus(deviceFunction.code);
        return status?.value as boolean;
      })
      .onSet(value => {
        this.deviceManager.sendCommands(this.device.id, [{
          code: deviceFunction.code,
          value: (value as number === 1) ? true : false,
        }]);
      });
  }

}
