import { PlatformAccessory, Service } from 'homebridge';
import { TuyaDeviceSchemaIntegerProperty, TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import { remap, limit } from '../util/util';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  ON: ['switch', 'switch_led', 'switch_1', 'switch_led_1'],
  BRIGHTNESS: ['bright_value', 'bright_value_1'],
};

export default class DimmerAccessory extends BaseAccessory {

  constructor(
    public readonly platform: TuyaPlatform,
    public readonly accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    this.configure();
  }

  requiredSchema() {
    return [SCHEMA_CODE.ON, SCHEMA_CODE.BRIGHTNESS];
  }

  getOnSchema(index: number) {
    if (index === 0) {
      return this.getSchema('switch', 'switch_led');
    }
    return this.getSchema(`switch_${index}`, `switch_led_${index}`);
  }

  getBrightnessSchema(index: number) {
    if (index === 0) {
      return this.getSchema('bright_value');
    }
    return this.getSchema(`bright_value_${index}`);
  }


  configure() {

    const oldService = this.accessory.getService(this.Service.Lightbulb);
    if (oldService && oldService?.subtype === undefined) {
      this.platform.log.warn('Remove old service:', oldService.UUID);
      this.accessory.removeService(oldService);
    }

    for (let index = 0; index <= 3; index++) {
      const schema = this.getBrightnessSchema(index);
      if (!schema) {
        continue;
      }

      const name = (index === 0) ? this.device.name : `${this.device.name} - ${index}`;

      const service = this.accessory.getService(schema.code)
        || this.accessory.addService(this.Service.Lightbulb, name, schema.code);

      service.setCharacteristic(this.Characteristic.Name, name);
      if (!service.testCharacteristic(this.Characteristic.ConfiguredName)) {
        service.addOptionalCharacteristic(this.Characteristic.ConfiguredName); // silence warning
        service.setCharacteristic(this.Characteristic.ConfiguredName, name);
      }

      this.configureOn(service, index);
      this.configureBrightness(service, index);
    }
  }

  configureOn(service: Service, index: number) {
    const schema = this.getOnSchema(index);
    if (!schema) {
      return;
    }

    service.getCharacteristic(this.Characteristic.On)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return status.value as boolean;
      })
      .onSet((value) => {
        this.log.debug(`Characteristic.On set to: ${value}`);
        this.sendCommands([{ code: schema.code, value: value as boolean }], true);
      });
  }

  configureBrightness(service: Service, index: number) {
    const schema = this.getBrightnessSchema(index);
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

    const minStatus = this.getStatus(`brightness_min_${index}`);
    const maxStatus = this.getStatus(`brightness_max_${index}`);
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
      }).setProps(props);

  }

  async onDeviceStatusUpdate(status: TuyaDeviceStatus[]) {

    // brightness range updated
    if (status.length !== this.device.status.length) {
      for (const _status of status) {
        if (!_status.code.startsWith('brightness_min_')
          && !_status.code.startsWith('brightness_max_')) {
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
