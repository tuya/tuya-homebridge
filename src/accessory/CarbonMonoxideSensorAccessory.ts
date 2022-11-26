import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  CO_STATUS: ['co_status', 'co_state'],
  CO_LEVEL: ['co_value'],
};

export default class CarbonMonoxideSensorAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.CO_STATUS];
  }

  configureServices() {
    this.configureCarbonMonoxideDetected();
    this.configureCarbonMonoxideLevel();
  }


  mainService() {
    return this.accessory.getService(this.Service.CarbonMonoxideSensor)
      || this.accessory.addService(this.Service.CarbonMonoxideSensor);
  }

  configureCarbonMonoxideDetected() {
    const schema = this.getSchema(...SCHEMA_CODE.CO_STATUS);
    if (!schema) {
      return;
    }

    const { CO_LEVELS_ABNORMAL, CO_LEVELS_NORMAL } = this.Characteristic.CarbonMonoxideDetected;
    this.mainService().getCharacteristic(this.Characteristic.CarbonMonoxideDetected)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value === 'alarm' || status.value === '1') ? CO_LEVELS_ABNORMAL : CO_LEVELS_NORMAL;
      });
  }

  configureCarbonMonoxideLevel() {
    const schema = this.getSchema(...SCHEMA_CODE.CO_LEVEL);
    if (!schema) {
      return;
    }

    this.mainService().getCharacteristic(this.Characteristic.CarbonMonoxideLevel)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const value = limit(status.value as number, 0, 100);
        return value;
      });
  }
}
