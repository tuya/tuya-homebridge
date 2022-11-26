import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  PRESENCE: ['presence_state'],
};

export default class HumanPresenceSensorAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.PRESENCE];
  }

  configureServices() {
    const schema = this.getSchema(...SCHEMA_CODE.PRESENCE);
    if (!schema) {
      return;
    }

    const { OCCUPANCY_DETECTED, OCCUPANCY_NOT_DETECTED } = this.Characteristic.OccupancyDetected;
    const service = this.accessory.getService(this.Service.OccupancySensor)
      || this.accessory.addService(this.Service.OccupancySensor);

    service.getCharacteristic(this.Characteristic.OccupancyDetected)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value === 'presence') ? OCCUPANCY_DETECTED : OCCUPANCY_NOT_DETECTED;
      });
  }

}
