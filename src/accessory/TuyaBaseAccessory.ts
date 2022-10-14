import { PlatformAccessory } from 'homebridge';

import TuyaDevice from '../device/TuyaDevice';
import TuyaDeviceManager from '../device/TuyaDeviceManager';
import { TuyaPlatform } from '../platform';

const APP_INFO = {
  'tuyaSmart': {
    'appId': 1586116399,
    'bundleId': 'com.tuya.smartiot',
    'manufacturer': 'Tuya Inc.',
  },
  'smartlife': {
    'appId': 1586125720,
    'bundleId': 'com.tuya.smartlifeiot',
    'manufacturer': 'Volcano Technology Limited',
  },
};

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class TuyaBaseAccessory {

  public deviceManager: TuyaDeviceManager;
  public device: TuyaDevice;

  constructor(
    private readonly platform: TuyaPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.deviceManager = platform.deviceManager!;
    this.device = this.deviceManager.getDevice(accessory.context.deviceID)!;

    const { appId, manufacturer } = APP_INFO[platform.config.options.appSchema];

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, manufacturer)
      .setCharacteristic(this.platform.Characteristic.AppMatchingIdentifier, appId)
      .setCharacteristic(this.platform.Characteristic.Model, this.device.product_id)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.uuid);

  }

}
