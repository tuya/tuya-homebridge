import { PlatformAccessory, Service, Characteristic } from 'homebridge';

import TuyaDevice, { TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';

const MANUFACTURER = 'Tuya Inc.';

/**
 * Homebridge Accessory Categories Documentation:
 *   https://developers.homebridge.io/#/categories
 * Tuya Standard Instruction Set Documentation:
 *   https://developer.tuya.com/en/docs/iot/standarddescription?id=K9i5ql6waswzq
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

    // set accessory information
    const service = this.accessory.getService(this.Service.AccessoryInformation)
    || this.accessory.addService(this.Service.AccessoryInformation);

    service
      .setCharacteristic(this.Characteristic.Manufacturer, MANUFACTURER)
      .setCharacteristic(this.Characteristic.Model, this.device.product_id)
      .setCharacteristic(this.Characteristic.Name, this.device.name)
      .setCharacteristic(this.Characteristic.SerialNumber, this.device.uuid)
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
