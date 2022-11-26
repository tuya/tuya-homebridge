import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  LEAK: ['gas_sensor_status', 'gas_sensor_state', 'ch4_sensor_state', 'watersensor_state'],
};

export default class LeakSensor extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.LEAK];
  }

  configureServices() {
    const { LEAK_NOT_DETECTED, LEAK_DETECTED } = this.Characteristic.LeakDetected;
    const service = this.accessory.getService(this.Service.LeakSensor)
      || this.accessory.addService(this.Service.LeakSensor);

    service.getCharacteristic(this.Characteristic.LeakDetected)
      .onGet(() => {
        const gas = this.getStatus('gas_sensor_status')
          || this.getStatus('gas_sensor_state');
        const ch4 = this.getStatus('ch4_sensor_state');
        const water = this.getStatus('watersensor_state');

        if ((gas && (gas.value === 'alarm' || gas.value === '1'))
          || (ch4 && ch4.value === 'alarm')
          || (water && water.value === 'alarm')) {
          return LEAK_DETECTED;
        } else {
          return LEAK_NOT_DETECTED;
        }
      });

  }

}
