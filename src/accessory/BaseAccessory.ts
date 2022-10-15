import { PlatformAccessory, Service, Characteristic } from 'homebridge';

import TuyaDevice, { TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';

const DEFAULT_APP_SCHEMA = 'tuyaSmart';
const APP_INFO = {
  'tuyaSmart': {
    'appId': '1586116399',
    'bundleId': 'com.tuya.smartiot',
    'manufacturer': 'Tuya Inc.',
  },
  'smartlife': {
    'appId': '1586125720',
    'bundleId': 'com.tuya.smartlifeiot',
    'manufacturer': 'Volcano Technology Limited',
  },
};

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class BaseAccessory {
  public readonly Service: typeof Service = this.platform.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.platform.api.hap.Characteristic;

  public deviceManager = this.platform.deviceManager!;
  public device = this.deviceManager.getDevice(this.accessory.context.deviceID)!;
  public log = this.platform.log;

  constructor(
    public readonly platform: TuyaPlatform,
    public readonly accessory: PlatformAccessory,
  ) {
    this.initServices();
  }

  initServices() {

    const { appId, bundleId, manufacturer } = APP_INFO[this.platform.config.options.appSchema || DEFAULT_APP_SCHEMA];

    // set accessory information
    const service = this.accessory.getService(this.Service.AccessoryInformation)
    || this.accessory.addService(this.Service.AccessoryInformation);

    service
      .setCharacteristic(this.Characteristic.Manufacturer, manufacturer)
      .setCharacteristic(this.Characteristic.Model, this.device.product_id)
      .setCharacteristic(this.Characteristic.Name, this.device.name)
      .setCharacteristic(this.Characteristic.SerialNumber, this.device.uuid)
      .setCharacteristic(this.Characteristic.AppMatchingIdentifier, bundleId)
    ;

  }

  async sendCommands(commands: TuyaDeviceStatus[]) {
    this.log.debug(`sendCommands ${JSON.stringify(commands)}`);
    await this.deviceManager.sendCommands(this.device.id, commands);
  }

  onDeviceInfoUpdate(device: TuyaDevice, info) {
    // name, online, ...
    this.log.debug(`onDeviceInfoUpdate devId=${device.id}, info=${JSON.stringify(info)}`);
  }

  onDeviceStatusUpdate(device: TuyaDevice, status: TuyaDeviceStatus[]) {
    this.log.debug(`onDeviceInfoUpdate devId=${device.id}, status=${JSON.stringify(status)}`);
  }

}
