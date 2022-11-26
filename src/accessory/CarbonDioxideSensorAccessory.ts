import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  CO2_STATUS: ['co2_state'],
  CO2_LEVEL: ['co2_value'],
};


export default class CarbonDioxideSensorAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.CO2_STATUS];
  }

  configureServices() {
    this.configureCarbonDioxideDetected();
    this.configureCarbonDioxideLevel();
  }


  mainService() {
    return this.accessory.getService(this.Service.CarbonDioxideSensor)
      || this.accessory.addService(this.Service.CarbonDioxideSensor);
  }

  configureCarbonDioxideDetected() {
    const schema = this.getSchema(...SCHEMA_CODE.CO2_STATUS);
    if (!schema) {
      return;
    }

    const { CO2_LEVELS_ABNORMAL, CO2_LEVELS_NORMAL } = this.Characteristic.CarbonDioxideDetected;
    this.mainService().getCharacteristic(this.Characteristic.CarbonDioxideDetected)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value === 'alarm') ? CO2_LEVELS_ABNORMAL : CO2_LEVELS_NORMAL;
      });
  }

  configureCarbonDioxideLevel() {
    const schema = this.getSchema(...SCHEMA_CODE.CO2_LEVEL);
    if (!schema) {
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.CarbonDioxideLevel)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const value = limit(status.value as number, 0, 100000);
        return value;
      });
  }

}
