/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { PlatformAccessory, Service, Characteristic } from 'homebridge';
import { debounce } from 'debounce';

import { TuyaDeviceSchema, TuyaDeviceSchemaMode, TuyaDeviceSchemaProperty, TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';
import { limit } from '../util/util';
import { PrefixLogger } from '../util/Logger';

const MANUFACTURER = 'Tuya Inc.';

const SCHEMA_CODE = {
  BATTERY_STATE: ['battery_state'],
  BATTERY_PERCENT: ['battery_percentage', 'residual_electricity', 'wireless_electricity', 'va_battery', 'battery'],
  BATTERY_CHARGING: ['charge_state'],
};


/**
 * Homebridge Accessory Categories Documentation:
 *   https://developers.homebridge.io/#/categories
 * Tuya Standard Instruction Set Documentation:
 *   https://developer.tuya.com/en/docs/iot/standarddescription?id=K9i5ql6waswzq
 */
class BaseAccessory {
  public readonly Service: typeof Service = this.platform.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.platform.api.hap.Characteristic;

  public deviceManager = this.platform.deviceManager!;
  public device = this.deviceManager.getDevice(this.accessory.context.deviceID)!;
  public log = new PrefixLogger(this.platform.log, this.device.name.length > 0 ? this.device.name : this.device.id);
  public intialized = false;

  constructor(
    public readonly platform: TuyaPlatform,
    public readonly accessory: PlatformAccessory,
  ) {
    this.addAccessoryInfoService();
    this.addBatteryService();
  }

  addAccessoryInfoService() {
    const service = this.accessory.getService(this.Service.AccessoryInformation)
      || this.accessory.addService(this.Service.AccessoryInformation);

    service
      .setCharacteristic(this.Characteristic.Manufacturer, MANUFACTURER)
      .setCharacteristic(this.Characteristic.Model, this.device.product_id)
      .setCharacteristic(this.Characteristic.Name, this.device.name)
      .setCharacteristic(this.Characteristic.ConfiguredName, this.device.name)
      .setCharacteristic(this.Characteristic.SerialNumber, this.device.uuid)
    ;
  }

  addBatteryService() {
    const percentSchema = this.getSchema(...SCHEMA_CODE.BATTERY_PERCENT);
    if (!percentSchema) {
      return;
    }

    const { BATTERY_LEVEL_NORMAL, BATTERY_LEVEL_LOW } = this.Characteristic.StatusLowBattery;
    const service = this.accessory.getService(this.Service.Battery)
      || this.accessory.addService(this.Service.Battery);

    const stateSchema = this.getSchema(...SCHEMA_CODE.BATTERY_STATE);
    if (stateSchema || percentSchema) {
      service.getCharacteristic(this.Characteristic.StatusLowBattery)
        .onGet(() => {
          if (stateSchema) {
            const status = this.getStatus(stateSchema.code)!;
            return (status!.value === 'low') ? BATTERY_LEVEL_LOW : BATTERY_LEVEL_NORMAL;
          }

          // fallback
          const status = this.getStatus(percentSchema.code)!;
          return (status!.value as number <= 20) ? BATTERY_LEVEL_LOW : BATTERY_LEVEL_NORMAL;
        });
    }

    service.getCharacteristic(this.Characteristic.BatteryLevel)
      .onGet(() => {
        const status = this.getStatus(percentSchema.code)!;
        return limit(status.value as number, 0, 100);
      });

    const chargingSchema = this.getSchema(...SCHEMA_CODE.BATTERY_CHARGING);
    if (chargingSchema) {
      const { NOT_CHARGING, CHARGING } = this.Characteristic.ChargingState;
      service.getCharacteristic(this.Characteristic.ChargingState)
        .onGet(() => {
          const status = this.getStatus(chargingSchema.code)!;
          return (status.value as boolean) ? CHARGING : NOT_CHARGING;
        });
    }
  }


  getSchema(...codes: string[]) {
    for (const code of codes) {
      const schema = this.device.schema.find(schema => schema.code === code);
      if (!schema) {
        continue;
      }

      // Readable schema must have a status
      if ([TuyaDeviceSchemaMode.READ_WRITE, TuyaDeviceSchemaMode.READ_ONLY].includes(schema.mode)
        && !this.getStatus(schema.code)) {
        continue;
      }

      return schema;
    }
    return undefined;
  }

  getStatus(code: string) {
    return this.device.status.find(status => status.code === code);
  }

  private sendQueue = new Map<string, TuyaDeviceStatus>();
  private debounceSendCommands = debounce(async () => {
    const commands = [...this.sendQueue.values()];
    if (commands.length === 0) {
      return;
    }
    await this.deviceManager.sendCommands(this.device.id, commands);
    this.sendQueue.clear();
  }, 100);

  async sendCommands(commands: TuyaDeviceStatus[], debounce = false) {
    if (commands.length === 0) {
      return;
    }

    // Update cache immediately
    for (const newStatus of commands) {
      const oldStatus = this.device.status.find(_status => _status.code === newStatus.code);
      if (oldStatus) {
        oldStatus.value = newStatus.value;
      }
    }

    if (debounce === false) {
      return await this.deviceManager.sendCommands(this.device.id, commands);
    }

    for (const newStatus of commands) {
      // Update send queue
      this.sendQueue.set(newStatus.code, newStatus);
    }

    this.debounceSendCommands();
  }

  checkRequirements() {
    let result = true;
    for (const codes of this.requiredSchema()) {
      const schema = this.getSchema(...codes);
      if (schema) {
        continue;
      }
      this.log.warn('Missing one of the required schema: %s', codes);
      this.log.warn('Please switch device control mode to "DP Insctrution", and set `deviceOverrides` manually.');
      this.log.warn('Detail information: https://github.com/0x5e/homebridge-tuya-platform#faq');
      result = false;
    }

    if (!result) {
      this.log.warn('Existing schema: %o', this.device.schema);
    }

    return result;
  }

  requiredSchema(): string[][] {
    return [];
  }

  configureServices() {
    //
  }

  async onDeviceInfoUpdate(info) {
    // name, online, ...
  }

  async onDeviceStatusUpdate(status: TuyaDeviceStatus[]) {
    for (const service of this.accessory.services) {
      for (const characteristic of service.characteristics) {
        const getHandler = characteristic['getHandler'];
        const newValue = getHandler ? (await getHandler()) : characteristic.value;
        if (characteristic.value === newValue) {
          continue;
        }
        this.log.debug('Update value %o => %o for service = %o, subtype = %o, characteristic = %o',
          characteristic.value, newValue, service.UUID, service.subtype, characteristic.UUID);
        characteristic.updateValue(newValue);
      }
    }
  }

}

// Overriding getSchema, getStatus, sendCommands
export default class OverridedBaseAccessory extends BaseAccessory {

  private eval = (script: string, value) => eval(script);

  private getOverridedSchema(code: string) {
    const schemaConfig = this.platform.getDeviceSchemaConfig(this.device, code);
    if (!schemaConfig) {
      return undefined;
    }

    const oldSchema = this.device.schema.find(schema => schema.code === schemaConfig.oldCode);
    if (!oldSchema) {
      return undefined;
    }

    const schema = {
      code,
      mode: oldSchema.mode,
      type: schemaConfig.type || oldSchema.type,
      property: schemaConfig.property || oldSchema.property,
    } as TuyaDeviceSchema;

    this.log.debug('Override schema %o => %o', oldSchema, schema);

    return schema;
  }

  getSchema(...codes: string[]) {
    for (const code of codes) {
      const schema = this.getOverridedSchema(code) || super.getSchema(code);
      if (!schema) {
        continue;
      }
      return schema;
    }
    return undefined;
  }


  private getOverridedStatus(code: string) {
    const schemaConfig = this.platform.getDeviceSchemaConfig(this.device, code);
    if (!schemaConfig) {
      return undefined;
    }

    const originalStatus = super.getStatus(schemaConfig.oldCode);
    if (!originalStatus) {
      return undefined;
    }

    const status = { code: schemaConfig.code, value: originalStatus.value } as TuyaDeviceStatus;
    if (schemaConfig.onGet) {
      status.value = this.eval(schemaConfig.onGet, originalStatus.value);
    }

    this.log.debug('Override status %o => %o', originalStatus, status);

    return status;
  }

  getStatus(code: string) {
    return this.getOverridedStatus(code) || super.getStatus(code);
  }


  async sendCommands(commands: TuyaDeviceStatus[], debounce?: boolean) {

    // convert to original commands
    for (const command of commands) {
      const schemaConfig = this.platform.getDeviceSchemaConfig(this.device, command.code);
      if (!schemaConfig) {
        continue;
      }

      const originalCommand = { code: schemaConfig.oldCode, value: command.value } as TuyaDeviceStatus;
      if (schemaConfig.onSet) {
        originalCommand.value = this.eval(schemaConfig.onSet, command.value);
      }

      this.log.debug('Override command %o => %o', command, originalCommand);
      command.code = originalCommand.code;
      command.value = originalCommand.value;
    }

    super.sendCommands(commands, debounce);
  }
}
