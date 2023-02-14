import { Service } from 'homebridge';
import { TuyaDeviceSchemaIntegerProperty, TuyaDeviceStatus } from '../device/TuyaDevice';
import { remap, limit } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureName } from './characteristic/Name';
import { configureOn } from './characteristic/On';

const SCHEMA_CODE = {
  ON: ['switch', 'switch_led', 'switch_1', 'switch_led_1'],
  BRIGHTNESS: ['bright_value', 'bright_value_1'],
};

export default class DimmerAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ON, SCHEMA_CODE.BRIGHTNESS];
  }

  configureServices() {

    const oldService = this.accessory.getService(this.Service.Lightbulb);
    if (oldService && oldService?.subtype === undefined) {
      this.platform.log.warn('Remove old service:', oldService.UUID);
      this.accessory.removeService(oldService);
    }

    const schema = this.device.schema.filter((schema) => schema.code.startsWith('bright_value'));
    for (const _schema of schema) {
      const suffix = _schema.code.replace('bright_value', '');
      const name = (schema.length === 1) ? this.device.name : _schema.code;

      const service = this.accessory.getService(_schema.code)
        || this.accessory.addService(this.Service.Lightbulb, name, _schema.code);

      configureName(this, service, name);
      configureOn(this, service, this.getSchema('switch' + suffix, 'switch_led' + suffix));
      this.configureBrightness(service, suffix);
    }
  }


  configureBrightness(service: Service, suffix: string) {
    const schema = this.getSchema('bright_value' + suffix);
    if (!schema) {
      return;
    }

    const { min, max } = schema.property as TuyaDeviceSchemaIntegerProperty;
    const range = max; // not max - min
    const props = {
      minValue: 0,
      maxValue: 100,
      minStep: 1,
    };

    const minStatus = this.getStatus('brightness_min' + suffix);
    const maxStatus = this.getStatus('brightness_max' + suffix);
    if (minStatus && maxStatus && maxStatus.value > minStatus.value) {
      const minValue = Math.ceil(remap(minStatus.value as number, 0, range, 0, 100));
      const maxValue = Math.floor(remap(maxStatus.value as number, 0, range, 0, 100));
      props.minValue = Math.max(props.minValue, minValue);
      props.maxValue = Math.min(props.maxValue, maxValue);
    }
    this.log.debug('Set props for Brightness:', props);

    service.getCharacteristic(this.Characteristic.Brightness)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        let value = status.value as number;
        value = remap(value, 0, range, 0, 100);
        value = Math.round(value);
        value = limit(value, props.minValue, props.maxValue);
        return value;
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.Brightness set to: ${value}`);
        let brightValue = value as number;
        brightValue = remap(brightValue, 0, 100, 0, range);
        brightValue = Math.round(brightValue);
        brightValue = limit(brightValue, min, max);
        this.sendCommands([{ code: schema.code, value: brightValue }], true);
      })
      .setProps(props);

  }

  async onDeviceStatusUpdate(status: TuyaDeviceStatus[]) {

    // brightness range updated
    if (status.length !== this.device.status.length) {
      for (const _status of status) {
        if (!_status.code.startsWith('brightness_min')
          && !_status.code.startsWith('brightness_max')) {
          continue;
        }

        this.platform.log.warn('Brightness range updated, please restart homebridge to take effect.');
        // TODO updating props
        // this.platform.log.debug('Brightness range updated, resetting props...');
        // this.configure();
        break;
      }
    }

    super.onDeviceStatusUpdate(status);
  }

}
