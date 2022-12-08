import { TuyaDeviceSchema, TuyaDeviceStatus } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';
import { configureProgrammableSwitchEvent, onProgrammableSwitchEvent } from './characteristic/ProgrammableSwitchEvent';

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

    configureProgrammableSwitchEvent(this, service, schema);
  }

  async onDeviceStatusUpdate(status: TuyaDeviceStatus[]) {
    super.onDeviceStatusUpdate(status);

    for (const _status of status) {
      const service = this.accessory.getService(_status.code);
      if (!service) {
        continue;
      }

      onProgrammableSwitchEvent(this, service, _status);
    }
  }

}
