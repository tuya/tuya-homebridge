import TuyaDevice, { TuyaDeviceStatus } from '../device/TuyaDevice';
import { BaseAccessory } from './BaseAccessory';

export default class SwitchAccessory extends BaseAccessory {

  initServices() {
    super.initServices();

    const switchFunctions = this.device.functions.filter(_function => _function.type.toUpperCase() === 'BOOLEAN');
    for (const switchFunction of switchFunctions) {
      const service = this.accessory.getService(switchFunction.code)
        || this.accessory.addService(this.Service.Switch, switchFunction.name, switchFunction.code);

      service.setCharacteristic(this.Characteristic.Name, switchFunction.name);

      service.getCharacteristic(this.Characteristic.On)
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

      if (_function.type.toUpperCase() !== 'BOOLEAN') {
        continue;
      }

      const service = this.accessory.getService(_function.code)!;
      service.updateCharacteristic(this.Characteristic.On, _status.value);
    }
  }

}
