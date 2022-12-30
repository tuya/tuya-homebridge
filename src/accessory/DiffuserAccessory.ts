import BaseAccessory from './BaseAccessory';
import { configureActive } from './characteristic/Active';
import { configureLight } from './characteristic/Light';
import { configureOn } from './characteristic/On';
import { configureRotationSpeedLevel } from './characteristic/RotationSpeed';

const SCHEMA_CODE = {
  ON: ['switch'],
  SPRAY_ON: ['switch_spray'],
  SPRAY_MODE: ['mode'],
  SPRAY_LEVEL: ['level'],
  LIGHT_ON: ['switch_led'],
  LIGHT_MODE: ['work_mode'],
  LIGHT_BRIGHT: ['bright_value', 'bright_value_v2'],
  LIGHT_COLOR: ['colour_data', 'colour_data_hsv'],
  SOUND_ON: ['switch_sound'],
};

export default class DiffuserAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.SPRAY_ON];
  }

  configureServices() {
    // Main Switch
    configureOn(this, undefined, this.getSchema(...SCHEMA_CODE.ON));

    this.configureDiffuser();

    configureLight(
      this,
      undefined,
      this.getSchema(...SCHEMA_CODE.LIGHT_ON),
      this.getSchema(...SCHEMA_CODE.LIGHT_BRIGHT),
      undefined,
      this.getSchema(...SCHEMA_CODE.LIGHT_COLOR),
      this.getSchema(...SCHEMA_CODE.LIGHT_MODE),
    );

    configureOn(this, undefined, this.getSchema(...SCHEMA_CODE.SOUND_ON)); // Sound Switch
  }

  mainService() {
    return this.accessory.getService(this.Service.AirPurifier)
      || this.accessory.addService(this.Service.AirPurifier);
  }

  configureDiffuser() {
    const sprayOnSchema = this.getSchema(...SCHEMA_CODE.SPRAY_ON)!;

    // Required Characteristics
    configureActive(this, this.mainService(), sprayOnSchema);

    const { INACTIVE, PURIFYING_AIR } = this.Characteristic.CurrentAirPurifierState;
    this.mainService().getCharacteristic(this.Characteristic.CurrentAirPurifierState)
      .onGet(() => {
        const status = this.getStatus(sprayOnSchema.code)!;
        return (status.value as boolean) ? PURIFYING_AIR : INACTIVE;
      });

    // const { MANUAL } = this.Characteristic.TargetAirPurifierState;
    // this.mainService().getCharacteristic(this.Characteristic.TargetAirPurifierState)
    //   .setProps({ validValues: [MANUAL] });


    // Optional Characteristics
    configureRotationSpeedLevel(this, this.mainService(), this.getSchema(...SCHEMA_CODE.SPRAY_LEVEL));
  }

}
