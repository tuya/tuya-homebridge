import TuyaDevice, { TuyaDeviceFunctionType, TuyaDeviceStatus } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';

export default class SwitchAccessory extends BaseAccessory {

  mainService() {
    return this.Service.Switch;
  }

  initServices() {
    super.initServices();

    const switchFunctions = this.device.functions.filter(_function => _function.type === TuyaDeviceFunctionType.Boolean);
    for (const switchFunction of switchFunctions) {
      const service = this.accessory.getService(switchFunction.code)
        || this.accessory.addService(this.mainService(), switchFunction.name, switchFunction.code);

      service.setCharacteristic(this.Characteristic.Name, switchFunction.name);

      service.getCharacteristic(this.Characteristic.On)
        .onGet(async () => {
          const status = this.device.status.find(status => status.code === switchFunction.code);
          return !!status && status!.value;
        })
        .onSet(async (value) => {
          await this.sendCommands([{
            code: switchFunction.code,
            value: value as boolean,
          }]);
        });

    }
  }

  onDeviceStatusUpdate(device: TuyaDevice, status: TuyaDeviceStatus[]): void {
    for (const _status of status) {
      const _function = device.functions.find(_function => _function.code === _status.code);
      if (!_function) {
        continue;
      }

      if (_function.type !== TuyaDeviceFunctionType.Boolean) {
        continue;
      }

      const service = this.accessory.getService(_function.code)!;
      service.updateCharacteristic(this.Characteristic.On, _status.value);
    }
  }

}
