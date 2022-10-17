import { TuyaDeviceFunction, TuyaDeviceFunctionType, TuyaDeviceStatus } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';

export default class SwitchAccessory extends BaseAccessory {

  public mainService = this.Service.Switch;

  configureService(deviceFunction: TuyaDeviceFunction) {
    if (deviceFunction.type !== TuyaDeviceFunctionType.Boolean) {
      return;
    }

    const service = this.accessory.getService(deviceFunction.code)
      || this.accessory.addService(this.mainService, deviceFunction.name, deviceFunction.code);

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

  onDeviceStatusUpdate(status: TuyaDeviceStatus[]): void {
    for (const deviceStatus of status) {
      const deviceFunction = this.device.getDeviceFunction(deviceStatus.code);
      if (!deviceFunction) {
        continue;
      }

      if (deviceFunction.type !== TuyaDeviceFunctionType.Boolean) {
        continue;
      }

      const service = this.accessory.getService(deviceFunction.code);
      if (!service) {
        continue;
      }
      service.updateCharacteristic(this.Characteristic.On, deviceStatus.value);
    }
  }

}
