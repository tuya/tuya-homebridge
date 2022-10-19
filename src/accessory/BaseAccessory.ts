/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { PlatformAccessory, Service, Characteristic } from 'homebridge';

import { TuyaDeviceFunction, TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';

const MANUFACTURER = 'Tuya Inc.';

/**
 * Homebridge Accessory Categories Documentation:
 *   https://developers.homebridge.io/#/categories
 * Tuya Standard Instruction Set Documentation:
 *   https://developer.tuya.com/en/docs/iot/standarddescription?id=K9i5ql6waswzq
 */
export default class BaseAccessory {
  public readonly Service: typeof Service = this.platform.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.platform.api.hap.Characteristic;

  public deviceManager = this.platform.deviceManager!;
  public device = this.deviceManager.getDevice(this.accessory.context.deviceID)!;
  public log = this.platform.log;

  constructor(
    public readonly platform: TuyaPlatform,
    public readonly accessory: PlatformAccessory,
  ) {

    const service = this.accessory.getService(this.Service.AccessoryInformation)
    || this.accessory.addService(this.Service.AccessoryInformation);

    service
      .setCharacteristic(this.Characteristic.Manufacturer, MANUFACTURER)
      .setCharacteristic(this.Characteristic.Model, this.device.product_id)
      .setCharacteristic(this.Characteristic.Name, this.device.name)
      .setCharacteristic(this.Characteristic.SerialNumber, this.device.uuid)
    ;

    for (const deviceFunction of this.device.functions) {
      const status = this.device.getDeviceStatus(deviceFunction.code);
      if (status) {
        this.configureService(deviceFunction);
      }
    }

    this.onDeviceStatusUpdate(this.device.status);

  }

  configureService(deviceFunction: TuyaDeviceFunction) {

  }

  onDeviceInfoUpdate(info) {
    // name, online, ...
  }

  async onDeviceStatusUpdate(status: TuyaDeviceStatus[]) {
    for (const service of this.accessory.services) {
      for (const characteristic of service.characteristics) {
        const getHandler = characteristic['getHandler'];
        const newValue = getHandler ? (await getHandler()) : characteristic.value;
        if (characteristic.value !== newValue) {
          // eslint-disable-next-line max-len
          this.log.debug(`Update value ${characteristic.value} => ${newValue} for devId=${this.device.id} service=${service.UUID}, subtype=${service.subtype}, characteristic=${characteristic.UUID}`);
          characteristic.updateValue(newValue);
        }
      }
    }
  }

}
