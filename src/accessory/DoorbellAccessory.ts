import { TuyaDeviceStatus } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';
import { configureProgrammableSwitchEvent, onProgrammableSwitchEvent } from './characteristic/ProgrammableSwitchEvent';

const SCHEMA_CODE = {
  ALARM_MESSAGE: ['alarm_message'],
  ALARM_SWITCH: ['alarm_propel_switch'],
  VOLUME: ['doorbell_volume_value'],
};

export default class DoorbellAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ALARM_MESSAGE];
  }

  configureServices() {
    this.log.warn('HomeKit Doorbell service does not work without camera anymore.');
    this.log.warn('Downgrade to StatelessProgrammableSwitch. "Mute" and "Volume" not available.');
    configureProgrammableSwitchEvent(this, this.getDoorbellService(), this.getSchema(...SCHEMA_CODE.ALARM_MESSAGE));
    // this.configureMute();
    // this.configureVolume();
  }

  /*
  configureMute() {
    const schema = this.getSchema(...SCHEMA_CODE.ALARM_SWITCH);
    if (!schema) {
      return;
    }

    this.getDoorbellService().getCharacteristic(this.Characteristic.Mute)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const value = !(status.value as boolean);
        return value;
      })
      .onSet(value => {
        const mute = !(value as boolean);
        this.sendCommands([{ code: schema.code, value: mute }], true);
      });
  }

  configureVolume() {
    const schema = this.getSchema(...SCHEMA_CODE.VOLUME);
    if (!schema) {
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = Math.pow(10, property.scale);
    const props = {
      minValue: property.min / multiple,
      maxValue: property.max / multiple,
      minStep: Math.max(1, property.step / multiple),
    };
    this.getDoorbellService().getCharacteristic(this.Characteristic.Volume)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const value = status.value as number / multiple;
        return value;
      })
      .onSet(value => {
        const volume = (value as number) * multiple;
        this.sendCommands([{ code: schema.code, value: volume }], true);
      })
      .setProps(props);
  }

  getDoorbellService() {
    return this.accessory.getService(this.Service.Doorbell)
      || this.accessory.addService(this.Service.Doorbell);
  }
  */

  getDoorbellService() {
    return this.accessory.getService(this.Service.StatelessProgrammableSwitch)
      || this.accessory.addService(this.Service.StatelessProgrammableSwitch);
  }

  async onDeviceStatusUpdate(status: TuyaDeviceStatus[]) {
    super.onDeviceStatusUpdate(status);

    const alarmMessageSchema = this.getSchema(...SCHEMA_CODE.ALARM_MESSAGE);
    if (alarmMessageSchema) {
      const alarmMessageStatus = status.find(_status => _status.code === alarmMessageSchema.code);
      if (alarmMessageStatus && (alarmMessageStatus.value as string).length > 1) {
        onProgrammableSwitchEvent(this, this.getDoorbellService(), alarmMessageStatus);
      }
    }
  }

}
