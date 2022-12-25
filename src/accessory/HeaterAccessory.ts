/* eslint-disable @typescript-eslint/no-unused-vars */
import { TuyaDeviceSchemaIntegerProperty } from '../device/TuyaDevice';
import { limit } from '../util/util';
import BaseAccessory from './BaseAccessory';
import { configureActive } from './characteristic/Active';
import { configureCurrentTemperature } from './characteristic/CurrentTemperature';
import { configureLockPhysicalControls } from './characteristic/LockPhysicalControls';
import { configureSwingMode } from './characteristic/SwingMode';
import { configureTempDisplayUnits } from './characteristic/TemperatureDisplayUnits';

const SCHEMA_CODE = {
  ACTIVE: ['switch'],
  WORK_STATE: ['work_state'],
  CURRENT_TEMP: ['temp_current'],
  TARGET_TEMP: ['temp_set'],
  LOCK: ['lock'],
  SWING: ['shake'],
  TEMP_UNIT_CONVERT: ['temp_unit_convert', 'c_f'],
};

export default class HeaterAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.ACTIVE];
  }

  configureServices() {
    configureActive(this, this.mainService(), this.getSchema(...SCHEMA_CODE.ACTIVE));
    this.configureCurrentState();
    this.configureTargetState();
    configureCurrentTemperature(this, this.mainService(), this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));
    configureLockPhysicalControls(this, this.mainService(), this.getSchema(...SCHEMA_CODE.LOCK));
    configureSwingMode(this, this.mainService(), this.getSchema(...SCHEMA_CODE.SWING));
    this.configureHeatingThreshouldTemp();
    configureTempDisplayUnits(this, this.mainService(), this.getSchema(...SCHEMA_CODE.TEMP_UNIT_CONVERT));
  }


  mainService() {
    return this.accessory.getService(this.Service.HeaterCooler)
      || this.accessory.addService(this.Service.HeaterCooler);
  }

  configureCurrentState() {
    const schema = this.getSchema(...SCHEMA_CODE.WORK_STATE);
    const { INACTIVE, IDLE, HEATING } = this.Characteristic.CurrentHeaterCoolerState;
    this.mainService().getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
      .onGet(() => {
        if (!schema) {
          return IDLE;
        }
        const status = this.getStatus(schema.code)!;
        if (status.value === 'heating') {
          return HEATING;
        } else if (status.value === 'warming') {
          return IDLE;
        }

        return INACTIVE;
      });
  }

  configureTargetState() {
    const { AUTO, HEAT, COOL } = this.Characteristic.TargetHeaterCoolerState;
    const validValues = [ AUTO ];
    this.mainService().getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
      .onGet(() => {
        return AUTO;
      })
      .onSet(value => {
        // TODO
      })
      .setProps({ validValues });
  }

  configureHeatingThreshouldTemp() {
    const schema = this.getSchema(...SCHEMA_CODE.TARGET_TEMP);
    if (!schema) {
      return;
    }

    const property = schema.property as TuyaDeviceSchemaIntegerProperty;
    const multiple = property ? Math.pow(10, property.scale) : 1;
    const props = {
      minValue: property.min / multiple,
      maxValue: property.max / multiple,
      minStep: Math.max(0.1, property.step / multiple),
    };
    this.log.debug('Set props for HeatingThresholdTemperature:', props);

    this.mainService().getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        const temp = status.value as number / multiple;
        return limit(temp, props.minValue, props.maxValue);
      })
      .onSet(value => {
        this.sendCommands([{ code: schema.code, value: (value as number) * multiple}]);
      })
      .setProps(props);
  }

}
