import { Service } from 'homebridge';
import BaseAccessory from '../BaseAccessory';

export function configureName(accessory: BaseAccessory, service: Service, name: string) {

  service.setCharacteristic(accessory.Characteristic.Name, name);
  if (!service.testCharacteristic(accessory.Characteristic.ConfiguredName)) {
    service.addOptionalCharacteristic(accessory.Characteristic.ConfiguredName); // silence warning
    service.setCharacteristic(accessory.Characteristic.ConfiguredName, name); // only add once
  }

}
