import BaseAccessory from './BaseAccessory';
import { configureOccupancyDetected } from './characteristic/OccupancyDetected';

const SCHEMA_CODE = {
  PRESENCE: ['presence_state'],
};

export default class HumanPresenceSensorAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.PRESENCE];
  }

  configureServices() {
    configureOccupancyDetected(this, undefined, this.getSchema(...SCHEMA_CODE.PRESENCE));
  }

}
