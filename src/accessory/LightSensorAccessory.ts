import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  BRIGHT_LEVEL: ['bright_value'],
};

export default class LightSensorAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.BRIGHT_LEVEL];
  }

  configureServices() {
    const schema = this.getSchema(...SCHEMA_CODE.BRIGHT_LEVEL);
    if (!schema) {
      return;
    }

    const service = this.accessory.getService(this.Service.LightSensor)
      || this.accessory.addService(this.Service.LightSensor);

    service.getCharacteristic(this.Characteristic.CurrentAmbientLightLevel)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return limit(status.value as number, 0.0001, 100000);
      });

  }

}
