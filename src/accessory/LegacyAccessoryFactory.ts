import { PlatformAccessory } from 'homebridge';
import TuyaDevice, { TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

import AirPurifierAccessory from './legacy/air_purifier_accessory';
import Fanv2Accessory from './legacy/fanv2_accessory';
import SmokeSensorAccessory from './legacy/smokesensor_accessory';
import HeaterAccessory from './legacy/heater_accessory';
import GarageDoorAccessory from './legacy/garagedoor_accessory';
import WindowCoveringAccessory from './legacy/window_covering_accessory';

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

    let handler;
    switch (device.category) {
      case 'kj':
        handler = new AirPurifierAccessory(platform, accessory, device);
        break;
      case 'fs':
      case 'fskg':
        handler = new Fanv2Accessory(platform, accessory, device);
        break;
      case 'ywbj':
        handler = new SmokeSensorAccessory(platform, accessory, device);
        break;
      case 'qn':
        handler = new HeaterAccessory(platform, accessory, device);
        break;
      case 'ckmkzq':
        handler = new GarageDoorAccessory(platform, accessory, device);
        break;
      case 'cl':
        handler = new WindowCoveringAccessory(platform, accessory, device);
        break;
    }

    if (handler) {
      handler = new LegacyAccessoryWrapper(handler, device) as unknown as BaseAccessory;
    }

    return handler;
  }
}
