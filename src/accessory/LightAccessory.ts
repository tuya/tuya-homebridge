import BaseAccessory from './BaseAccessory';
import { configureOn } from './characteristic/On';
import { configureMotionDetected } from './characteristic/MotionDetected';
import { configureLight } from './characteristic/Light';

const SCHEMA_CODE = {
  ON: ['switch_led'],
  BRIGHTNESS: ['bright_value', 'bright_value_v2'],
  COLOR_TEMP: ['temp_value', 'temp_value_v2'],
  COLOR: ['colour_data', 'colour_data_v2'],
  WORK_MODE: ['work_mode'],
  PIR: ['pir_state'],
  PIR_ON: ['switch_pir'],
  POWER_SWITCH: ['switch'],
};

export default class LightAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ON];
  }

  configureServices() {

    const service = this.accessory.getService(this.Service.Lightbulb)
      || this.accessory.addService(this.Service.Lightbulb);

    configureLight(
      this,
      service,
      this.getSchema(...SCHEMA_CODE.ON),
      this.getSchema(...SCHEMA_CODE.BRIGHTNESS),
      this.getSchema(...SCHEMA_CODE.COLOR_TEMP),
      this.getSchema(...SCHEMA_CODE.COLOR),
      this.getSchema(...SCHEMA_CODE.WORK_MODE),
    );

    // PIR
    configureOn(this, undefined, this.getSchema(...SCHEMA_CODE.PIR_ON));
    configureMotionDetected(this, undefined, this.getSchema(...SCHEMA_CODE.PIR));

    // RGB Power Switch
    configureOn(this, undefined, this.getSchema(...SCHEMA_CODE.POWER_SWITCH));
  }

}
