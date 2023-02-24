import { TuyaDeviceSchema, TuyaDeviceSchemaType } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';
import { configureName } from './characteristic/Name';
import { configureOn } from './characteristic/On';
import { configureEnergyUsage } from './characteristic/EnergyUsage';
import { configureCurrentTemperature } from './characteristic/CurrentTemperature';
import { configureCurrentRelativeHumidity } from './characteristic/CurrentRelativeHumidity';

const SCHEMA_CODE = {
  ON: ['switch', 'switch_1'], // switch_2, switch_3, switch_4, ..., switch_usb1, switch_usb2, switch_usb3, ..., switch_backlight
  CURRENT: ['cur_current'],
  POWER: ['cur_power'],
  VOLTAGE: ['cur_voltage'],
  TOTAL_POWER: ['add_ele'],
  CURRENT_TEMP: ['va_temperature', 'temp_current'],
  CURRENT_HUMIDITY: ['va_humidity', 'humidity_value'],
};

export default class SwitchAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ON];
  }

  configureServices() {

    const oldService = this.accessory.getService(this.mainService());
    if (oldService && oldService?.subtype === undefined) {
      this.platform.log.warn('Remove old service:', oldService.UUID);
      this.accessory.removeService(oldService);
    }

    const schemata = this.device.schema.filter(
      (schema) => schema.code.startsWith('switch') && schema.type === TuyaDeviceSchemaType.Boolean,
    );

    schemata.forEach((schema) => {
      const name = (schemata.length === 1) ? this.device.name : schema.code;
      this.configureSwitch(schema, name);
    });


    // Other
    configureCurrentTemperature(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));
    configureCurrentRelativeHumidity(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_HUMIDITY));
  }


  mainService() {
    return this.Service.Switch;
  }

  configureSwitch(schema: TuyaDeviceSchema, name: string) {

    const service = this.accessory.getService(schema.code)
      || this.accessory.addService(this.mainService(), name, schema.code);

    configureName(this, service, name);
    configureOn(this, service, schema);

    if (schema.code === this.getSchema(...SCHEMA_CODE.ON)?.code) {
      configureEnergyUsage(
        this.platform.api,
        this,
        service,
        this.getSchema(...SCHEMA_CODE.CURRENT),
        this.getSchema(...SCHEMA_CODE.POWER),
        this.getSchema(...SCHEMA_CODE.VOLTAGE),
        this.getSchema(...SCHEMA_CODE.TOTAL_POWER),
      );
    }
  }

}
