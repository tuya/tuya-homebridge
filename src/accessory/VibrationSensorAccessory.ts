import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  STATE: ['shock_state'],
};

export default class VibrationSensorAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.STATE];
  }

  configureServices() {
    const service = this.accessory.getService(this.Service.MotionSensor)
    || this.accessory.addService(this.Service.MotionSensor);

    const schema = this.getSchema(...SCHEMA_CODE.STATE)!;
    service.getCharacteristic(this.Characteristic.MotionDetected)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return status.value !== 'normal';
      });
  }

}
