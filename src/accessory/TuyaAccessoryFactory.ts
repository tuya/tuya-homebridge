import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import { TuyaBaseAccessory } from './TuyaBaseAccessory';
import TuyaDevice from '../device/TuyaDevice';

export default class TuyaAccessoryFactory {
  static createAccessory(
    platform: TuyaPlatform,
    accessory: PlatformAccessory,
    device: TuyaDevice,
  ) {
    let handler: TuyaBaseAccessory;
    switch (device.category) {
      // TODO
      default:
        handler = new TuyaBaseAccessory(platform, accessory);
        break;
    }
    return handler;
  }
}
