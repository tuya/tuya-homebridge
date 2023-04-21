import { TuyaDeviceStatus } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';
import { configureCurrentRelativeHumidity } from './characteristic/CurrentRelativeHumidity';
import { configureCurrentTemperature } from './characteristic/CurrentTemperature';

const SCHEMA_CODE = {
  CURRENT_TEMP: ['va_temperature'],
  CURRENT_HUMIDITY: ['va_humidity', 'humidity_value'],
};

export default class IRControlHubAccessory extends BaseAccessory {

  requiredSchema() {
    return [];
  }

  configureServices() {
    configureCurrentTemperature(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));
    configureCurrentRelativeHumidity(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_HUMIDITY));
  }

  getSubAccessories() {
    return this.platform.accessoryHandlers.filter(accessory => accessory.device.parent_id === this.device.id);
  }

  async onDeviceStatusUpdate(status: TuyaDeviceStatus[]) {
    super.onDeviceStatusUpdate(status);

    // Trigger sub device update temperature & humidity from parent device.
    for (const subAccessory of this.getSubAccessories()) {
      await subAccessory.updateAllValues();
    }
  }
}
