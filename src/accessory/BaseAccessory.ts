/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { PlatformAccessory, Service, Characteristic } from 'homebridge';

import { TuyaDeviceSchema, TuyaDeviceStatus } from '../device/TuyaDevice';
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

    this.addAccessoryInfoService();
    this.addBatteryService();

    for (const schema of this.device.schema) {
      this.configureService(schema);
    }

    this.onDeviceStatusUpdate(this.device.status);

  }

  addAccessoryInfoService() {
    const service = this.accessory.getService(this.Service.AccessoryInformation)
    || this.accessory.addService(this.Service.AccessoryInformation);

    service
      .setCharacteristic(this.Characteristic.Manufacturer, MANUFACTURER)
      .setCharacteristic(this.Characteristic.Model, this.device.product_id)
      .setCharacteristic(this.Characteristic.Name, this.device.name)
      .setCharacteristic(this.Characteristic.SerialNumber, this.device.uuid)
    ;
  }

  addBatteryService() {
    if (!this.getBatteryPercentage()) {
      return;
    }

    const service = this.accessory.getService(this.Service.Battery)
      || this.accessory.addService(this.Service.Battery);

    if (this.getBatteryState() || this.getBatteryPercentage()) {
      service.getCharacteristic(this.Characteristic.StatusLowBattery)
        .onGet(() => {
          let status = this.getBatteryState();
          if (status) {
            return (status!.value === 'low') ?
              this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW :
              this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
          }

          // fallback
          status = this.getBatteryPercentage();
          return (status!.value as number <= 20) ?
            this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW :
            this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

        });
    }

    if (this.getBatteryPercentage()) {
      service.getCharacteristic(this.Characteristic.BatteryLevel)
        .onGet(() => {
          const status = this.getBatteryPercentage();
          let percent = Math.max(0, status!.value as number);
          percent = Math.min(100, percent);
          return percent;
        });
    }

    if (this.getChargeState()) {
      service.getCharacteristic(this.Characteristic.ChargingState)
        .onGet(() => {
          const status = this.getChargeState();
          return (status?.value as boolean) ?
            this.Characteristic.ChargingState.CHARGING :
            this.Characteristic.ChargingState.NOT_CHARGING;
        });
    }
  }

  getBatteryState() {
    return this.device.getStatus('battery_state');
  }

  getBatteryPercentage() {
    return this.device.getStatus('battery_percentage')
      || this.device.getStatus('residual_electricity');
  }

  getChargeState() {
    return this.device.getStatus('charge_state');
  }


  configureService(schema: TuyaDeviceSchema) {

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
