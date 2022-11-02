import { PlatformAccessory } from 'homebridge';
import TuyaDevice, { TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

import AirPurifierAccessory from './legacy/air_purifier_accessory';
import HeaterAccessory from './legacy/heater_accessory';

class LegacyAccessoryWrapper {

  constructor(
    public handler,
    public device: TuyaDevice,
  ) {

  }

  async onDeviceStatusUpdate(status: TuyaDeviceStatus[]) {
    this.handler.updateState({ devId: this.device.id, status });
  }

}

export default class LegacyAccessoryFactory {
  static createAccessory(
    platform: TuyaPlatform,
    accessory: PlatformAccessory,
    device: TuyaDevice,
  ) {

    if (!platform['tuyaOpenApi']) {
      platform['tuyaOpenApi'] = {
        sendCommand: async (deviceID: string, params) => await platform.deviceManager?.sendCommands(deviceID, params.commands),
      };
    }

    device['functions'] = device.schema;

    let handler;
    switch (device.category) {
      case 'kj':
        handler = new AirPurifierAccessory(platform, accessory, device);
        break;
      case 'qn':
        handler = new HeaterAccessory(platform, accessory, device);
        break;
    }

    if (handler) {
      handler = new LegacyAccessoryWrapper(handler, device) as unknown as BaseAccessory;
    }

    return handler;
  }
}
