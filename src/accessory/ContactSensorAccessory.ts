import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  CONTACT_STATE: ['doorcontact_state', 'switch'],
};

export default class ContaceSensor extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.CONTACT_STATE];
  }

  configureServices() {
    const schema = this.getSchema(...SCHEMA_CODE.CONTACT_STATE);
    if (!schema) {
      return;
    }
    const service = this.accessory.getService(this.Service.ContactSensor)
    || this.accessory.addService(this.Service.ContactSensor);

    const { CONTACT_NOT_DETECTED, CONTACT_DETECTED } = this.Characteristic.ContactSensorState;
    service.getCharacteristic(this.Characteristic.ContactSensorState)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return status.value ? CONTACT_NOT_DETECTED : CONTACT_DETECTED;
      });
  }

}
