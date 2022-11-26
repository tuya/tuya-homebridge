import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  SENSOR_STATUS: ['smoke_sensor_status', 'smoke_sensor_state'],
};

export default class SmokeSensor extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.SENSOR_STATUS];
  }

  configureServices() {
    const schema = this.getSchema(...SCHEMA_CODE.SENSOR_STATUS);
    if (!schema) {
      return;
    }

    const { SMOKE_NOT_DETECTED, SMOKE_DETECTED } = this.Characteristic.SmokeDetected;
    const service = this.accessory.getService(this.Service.SmokeSensor)
      || this.accessory.addService(this.Service.SmokeSensor);

    service.getCharacteristic(this.Characteristic.SmokeDetected)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        if ((status.value === 'alarm' || status.value === '1')) {
          return SMOKE_DETECTED;
        } else {
          return SMOKE_NOT_DETECTED;
        }
      });
  }

}
