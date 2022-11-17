import { PlatformAccessory } from 'homebridge';
import { TuyaPlatform } from '../platform';
import { TuyaDeviceSchemaIntegerProperty } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';

export default class HumidifierAccessory extends BaseAccessory {

  constructor(platform: TuyaPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);

    this.configureActive();
    this.configureTargetState();
    this.configureCurrentState();
    this.configureCurrentRelativeHumidity();
    this.configureRelativeHumidityHumidifierThreshold();
    this.configureTemperatureSensor();
  }

  mainService() {
    return this.accessory.getService(this.Service.HumidifierDehumidifier)
      || this.accessory.addService(this.Service.HumidifierDehumidifier);
  }

  configureActive() {
    const { ACTIVE, INACTIVE } = this.Characteristic.Active;
    this.mainService().getCharacteristic(this.Characteristic.Active)
      .onGet(() => {
        const status = this.getStatus('switch');
        return (status?.value as boolean) ? ACTIVE : INACTIVE;
      })
      .onSet(value => {
        this.sendCommands([{ code: 'switch', value: (value === ACTIVE) ? true : false }]);
      });
  }

  configureTargetState() {
    const { HUMIDIFIER } = this.Characteristic.TargetHumidifierDehumidifierState;
    const validValues = [HUMIDIFIER];

    this.mainService().getCharacteristic(this.Characteristic.TargetHumidifierDehumidifierState)
      .onGet(() => {
        return HUMIDIFIER;
      }).setProps({ validValues });
  }

  configureCurrentState() {
    const { INACTIVE, HUMIDIFYING } = this.Characteristic.CurrentHumidifierDehumidifierState;

    this.mainService().getCharacteristic(this.Characteristic.CurrentHumidifierDehumidifierState)
      .onGet(() => {
        const status = this.getStatus('switch');
        return (status?.value as boolean) ? HUMIDIFYING : INACTIVE;
      });
  }

  configureCurrentRelativeHumidity() {
    const schema = this.getSchema('humidity_current');
    if (!schema) {
      this.log.warn('HumiditySensor not supported.');
      return;
    }
    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = Math.pow(10, property ? property.scale : 0);

    this.mainService().getCharacteristic(this.Characteristic.CurrentRelativeHumidity)
      .onGet(() => {
        const status = this.getStatus('humidity_current');
        let humidity = Math.floor(status!.value as number / multiple);
        humidity = Math.min(100, humidity);
        humidity = Math.max(0, humidity);
        return humidity;
      });
  }

  configureRelativeHumidityHumidifierThreshold() {
    const schema = this.getSchema('humidity_set');
    if (!schema) {
      this.log.warn('Humidity setting is not supported.');
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = Math.pow(10, property ? property.scale : 0);

    this.mainService().getCharacteristic(this.Characteristic.RelativeHumidityHumidifierThreshold)
      .onGet(() => {
        const status = this.getStatus(schema.code);
        let humidity_set = status?.value as number / multiple;
        humidity_set = Math.max(0, humidity_set);
        humidity_set = Math.min(100, humidity_set);
        return humidity_set;
      })
      .onSet(value => {
        let humidity_set = value as number * multiple;
        humidity_set = Math.max(property['min'], humidity_set);
        humidity_set = Math.min(property['max'], humidity_set);
        this.sendCommands([{ code: schema.code, value: humidity_set }]);
        // also set spray mode to humidity
        this.setSprayModeToHumidity();
      }).setProps({ minStep: property['step'] });
  }

  configureTemperatureSensor() {
    const service = this.accessory.getService(this.Service.TemperatureSensor)
      || this.accessory.addService(this.Service.TemperatureSensor);
    const schema = this.getSchema('temp_current');
    if (!schema) {
      this.platform.log.warn('TemperatureSensor not supported.');
      return;
    }
    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = Math.pow(10, property ? property.scale : 0);

    service.getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(() => {
        const status = this.getStatus(schema.code);
        let temperature = status!.value as number / multiple;

        temperature = Math.max(-270, temperature);
        temperature = Math.min(100, temperature);
        return temperature;
      });

  }

  setSprayModeToHumidity() {
    this.sendCommands([{ code: 'spray_mode', value: 'humidity' }]);
  }

}
