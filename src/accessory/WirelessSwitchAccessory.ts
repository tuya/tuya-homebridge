import { TuyaDeviceSchema, TuyaDeviceStatus } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  ON: ['switch_mode1', 'switch1_value'],
};

export default class SwitchAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ON];
  }

  configureServices() {
    const schema = this.device.schema.filter(schema => schema.code.match(/switch_mode(\d+)/) || schema.code.match(/switch(\d+)_value/));
    for (const _schema of schema) {
      const name = (schema.length === 1) ? this.device.name : _schema.code;
      this.configureSwitch(_schema, name);
    }
  }

  configureSwitch(schema: TuyaDeviceSchema, name: string) {

    const service = this.accessory.getService(schema.code)
      || this.accessory.addService(this.Service.StatelessProgrammableSwitch, name, schema.code);

    const group = schema.code.match(/switch_mode(\d+)/) || schema.code.match(/switch(\d+)_value/);
    const index = group![1];
    service.setCharacteristic(this.Characteristic.ServiceLabelIndex, index);

  }

  async onDeviceStatusUpdate(status: TuyaDeviceStatus[]) {
    super.onDeviceStatusUpdate(status);

    const { SINGLE_PRESS, DOUBLE_PRESS, LONG_PRESS } = this.Characteristic.ProgrammableSwitchEvent;
    for (const _status of status) {
      const characteristic = this.accessory.getService(_status.code)?.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent);
      if (!characteristic) {
        continue;
      }

      let value: number;
      if (_status.value === 'click' || _status.value === 'single_click') {
        value = SINGLE_PRESS;
      } else if (_status.value === 'double_click') {
        value = DOUBLE_PRESS;
      } else if (_status.value === 'press' || _status.value === 'long_press') {
        value = LONG_PRESS;
      } else {
        continue;
      }

      this.log.debug('ProgrammableSwitchEvent updateValue: %o %o', _status.code, value);
      characteristic.updateValue(value);

    }
  }

}
