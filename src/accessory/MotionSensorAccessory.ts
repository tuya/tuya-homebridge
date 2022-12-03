import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import BaseAccessory from './BaseAccessory';
import { configureMotionDetected } from './characteristic/MotionDetected';

const SCHEMA_CODE = {
  PIR: ['pir'],
};

export default class MotionSensorAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    configureMotionDetected(this, undefined, this.getSchema(...SCHEMA_CODE.PIR));
  }

  requiredSchema() {
    return [SCHEMA_CODE.PIR];
  }

}
