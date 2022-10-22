import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { Validator } from 'jsonschema';

import TuyaOpenMQ from './core/TuyaOpenMQ';
import TuyaDevice, { TuyaDeviceStatus } from './device/TuyaDevice';
import TuyaDeviceManager from './device/TuyaDeviceManager';
import TuyaCustomDeviceManager from './device/TuyaCustomDeviceManager';
import TuyaHomeDeviceManager from './device/TuyaHomeDeviceManager';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { TuyaPlatformConfigOptions, customOptionsSchema, homeOptionsSchema } from './config';
import AccessoryFactory from './accessory/AccessoryFactory';
import BaseAccessory from './accessory/BaseAccessory';
import TuyaOpenAPI, { LOGIN_ERROR_MESSAGES } from './core/TuyaOpenAPI';


/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class TuyaPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public options = this.config.options as TuyaPlatformConfigOptions;

  // this is used to track restored cached accessories
  public cachedAccessories: PlatformAccessory[] = [];

  public deviceManager?: TuyaDeviceManager;
  public accessoryHandlers: BaseAccessory[] = [];

  validate(config) {
    let result;
    if (!config.options) {
      this.log.warn('Not configured, exit.');
      return false;
    } else if (config.options.projectType === '1') {
      result = new Validator().validate(config.options, customOptionsSchema);
    } else if (config.options.projectType === '2') {
      result = new Validator().validate(config.options, homeOptionsSchema);
    } else {
      this.log.warn(`Unsupported projectType: ${config.options.projectType}, exit.`);
      return false;
    }
    result.errors.forEach(error => this.log.error(error.stack));
    return result.errors.length === 0;
  }

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    if (!this.validate(config)) {
      return;
    }

    this.log.debug('Finished initializing platform');

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      await this.initDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.cachedAccessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async initDevices() {

    let devices: TuyaDevice[];
    if (this.options.projectType === '1') {
      const { endpoint, accessId, accessKey, username, password } = this.options;

      this.log.info('Log in to Tuya Cloud.');
      const api = new TuyaOpenAPI(endpoint, accessId, accessKey, this.log);
      const res = await api.customLogin(username, password);
      if (res.success === false) {
        this.log.error(`Login failed. code=${res.code}, msg=${res.msg}`);
        if (LOGIN_ERROR_MESSAGES[res.code]) {
          this.log.error(LOGIN_ERROR_MESSAGES[res.code]);
        }
        return;
      }

      this.log.info('Start MQTT connection.');
      const mq = new TuyaOpenMQ(api, '2.0', this.log);
      mq.start();

      this.log.info('Fetching device list.');
      this.deviceManager = new TuyaCustomDeviceManager(api, mq);
      devices = await this.deviceManager.updateDevices();

    } else if (this.options.projectType === '2') {
      const { accessId, accessKey, countryCode, username, password, appSchema } = this.options;

      this.log.info('Log in to Tuya Cloud.');
      const api = new TuyaOpenAPI(TuyaOpenAPI.Endpoints.AMERICA, accessId, accessKey, this.log);
      const res = await api.homeLogin(countryCode, username, password, appSchema);
      if (res.success === false) {
        this.log.error(`Login failed. code=${res.code}, msg=${res.msg}`);
        if (LOGIN_ERROR_MESSAGES[res.code]) {
          this.log.error(LOGIN_ERROR_MESSAGES[res.code]);
        }
        return;
      }

      this.log.info('Start MQTT connection.');
      const mq = new TuyaOpenMQ(api, '1.0', this.log);
      mq.start();

      this.log.info('Fetching device list.');
      this.deviceManager = new TuyaHomeDeviceManager(api, mq);
      devices = await this.deviceManager.updateDevices();

    } else {
      this.log.warn(`Unsupported projectType: ${this.config.options.projectType}, stop device discovery.`);
      return;
    }

    // add accessories
    for (const device of devices) {
      this.addAccessory(device);
    }

    // remove unused accessories
    for (const cachedAccessory of this.cachedAccessories) {
      this.log.warn('Removing unused accessory from cache:', cachedAccessory.displayName);
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [cachedAccessory]);
    }
    this.cachedAccessories = [];

    this.deviceManager.on(TuyaDeviceManager.Events.DEVICE_ADD, this.addAccessory.bind(this));
    this.deviceManager.on(TuyaDeviceManager.Events.DEVICE_INFO_UPDATE, this.updateAccessoryInfo.bind(this));
    this.deviceManager.on(TuyaDeviceManager.Events.DEVICE_STATUS_UPDATE, this.updateAccessoryStatus.bind(this));
    this.deviceManager.on(TuyaDeviceManager.Events.DEVICE_DELETE, this.removeAccessory.bind(this));

  }

  addAccessory(device: TuyaDevice) {

    const uuid = this.api.hap.uuid.generate(device.id);
    const existingAccessory = this.cachedAccessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

      // Update context
      if (!existingAccessory.context || !existingAccessory.context.deviceID) {
        this.log.info('Update accessory context:', existingAccessory.displayName);
        existingAccessory.context.deviceID = device.id;
        this.api.updatePlatformAccessories([existingAccessory]);
      }

      // create the accessory handler for the restored accessory
      const handler = AccessoryFactory.createAccessory(this, existingAccessory, device);
      this.accessoryHandlers.push(handler);

      const index = this.cachedAccessories.indexOf(existingAccessory);
      if (index >= 0) {
        this.cachedAccessories.splice(index, 1);
      }

    } else {
      // the accessory does not yet exist, so we need to create it
      this.log.info('Adding new accessory:', device.name);

      // create a new accessory
      const accessory = new this.api.platformAccessory(device.name, uuid);
      accessory.context.deviceID = device.id;

      // create the accessory handler for the newly create accessory
      const handler = AccessoryFactory.createAccessory(this, accessory, device);
      this.accessoryHandlers.push(handler);

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }

  updateAccessoryInfo(device: TuyaDevice, info) {
    const handler = this.getAccessoryHandler(device.id);
    if (!handler) {
      return;
    }

    this.log.debug(`onDeviceInfoUpdate devId=${device.id}, info=${JSON.stringify(info)}`);
    handler.onDeviceInfoUpdate(info);
  }

  updateAccessoryStatus(device: TuyaDevice, status: TuyaDeviceStatus[]) {
    const handler = this.getAccessoryHandler(device.id);
    if (!handler) {
      return;
    }

    this.log.debug(`onDeviceStatusUpdate devId=${device.id}, status=${JSON.stringify(status)}`);
    handler.onDeviceStatusUpdate(status);
  }

  removeAccessory(deviceID: string) {
    const handler = this.getAccessoryHandler(deviceID);
    if (!handler) {
      return;
    }

    const index = this.accessoryHandlers.indexOf(handler);
    if (index >= 0) {
      this.accessoryHandlers.splice(index, 1);
    }

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [handler.accessory]);
    this.log.info('Removing existing accessory from cache:', handler.accessory.displayName);
  }

  getAccessoryHandler(deviceID: string) {
    return this.accessoryHandlers.find(handler => handler.device.id === deviceID);
  }

}
