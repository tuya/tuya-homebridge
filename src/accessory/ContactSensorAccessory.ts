import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

export default class ContaceSensor extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    const service = this.accessory.getService(this.Service.ContactSensor)
      || this.accessory.addService(this.Service.ContactSensor);

    service.getCharacteristic(this.Characteristic.ContactSensorState)
      .onGet(() => {
        const status = this.device.getDeviceStatus('doorcontact_state');
        return status!.value ?
          this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED:
          this.Characteristic.ContactSensorState.CONTACT_DETECTED;
      });

    service.getCharacteristic(this.Characteristic.StatusLowBattery)
      .onGet(() => {
        const { BATTERY_LEVEL_LOW, BATTERY_LEVEL_NORMAL } = this.Characteristic.StatusLowBattery;
        const status = this.device.getDeviceStatus('battery_state');
        if (status) {
          return (status.value === 'low') ? BATTERY_LEVEL_LOW : BATTERY_LEVEL_NORMAL;
        }

        const percent = this.device.getDeviceStatus('battery_percentage');
        if (percent) {
          return (percent.value <= 20) ? BATTERY_LEVEL_LOW : BATTERY_LEVEL_NORMAL;
        }
        return BATTERY_LEVEL_NORMAL;
      });

  }

}
