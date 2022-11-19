import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  PIR: ['pir'],
};

export default class MotionSensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    this.configureMotionDetected();
  }

  requiredSchema() {
    return [SCHEMA_CODE.PIR];
  }

  configureMotionDetected() {
    const schema = this.getSchema(...SCHEMA_CODE.PIR);
    if (!schema) {
      return;
    }

    const service = this.accessory.getService(this.Service.MotionSensor)
      || this.accessory.addService(this.Service.MotionSensor);

    service.getCharacteristic(this.Characteristic.MotionDetected)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value === 'pir');
      });
  }

}
