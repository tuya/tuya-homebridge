import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import TuyaCustomOpenAPI from './core/TuyaCustomOpenAPI';
import TuyaHomeOpenAPI from './core/TuyaHomeOpenAPI';
import TuyaOpenMQ from './core/TuyaOpenMQ';
import TuyaDevice from './device/TuyaDevice';
import TuyaDeviceManager, { Events } from './device/TuyaDeviceManager';
import TuyaCustomDeviceManager from './device/TuyaCustomDeviceManager';
import TuyaHomeDeviceManager from './device/TuyaHomeDeviceManager';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { TuyaPlatformConfigOptions, validate } from './config';
import AccessoryFactory from './accessory/AccessoryFactory';
import BaseAccessory from './accessory/BaseAccessory';
import { Endpoints } from './core/TuyaOpenAPI';

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

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    validate(this.options);

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

    const {
      endpoint,
      accessId,
      accessKey,
      projectType,
      countryCode,
      username,
      password,
      appSchema,
    } = this.options;

    let devices: Set<TuyaDevice>;
    if (projectType === '1') {

      const api = new TuyaCustomOpenAPI(endpoint! as Endpoints, accessId, accessKey, this.log);
      await api.login(username, password);

      const mq = new TuyaOpenMQ(api, '2.0', this.log);
      mq.start();

      this.deviceManager = new TuyaCustomDeviceManager(api, mq);
      try {
        devices = await this.deviceManager.updateDevices();
      } catch (e) {
        this.log.warn('Failed to get device information. Please check if the config.json is correct.');
        return;
      }

    } else if (projectType === '2') {

      const api = new TuyaHomeOpenAPI(endpoint! as Endpoints || TuyaHomeOpenAPI.Endpoints.AMERICA, accessId, accessKey, this.log);
      await api.login(countryCode!, username, password, appSchema!);

      const mq = new TuyaOpenMQ(api, '1.0', this.log);
      mq.start();

      this.deviceManager = new TuyaHomeDeviceManager(api, mq);
      try {
        devices = await this.deviceManager.updateDevices();
      } catch (e) {
        this.log.warn('Failed to get device information. Please check if the config.json is correct.');
        return;
      }

    } else {
      this.log.warn(`Unsupported projectType: ${projectType}, stop device discovery.`);
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

    this.deviceManager.on(Events.DEVICE_ADD, this.addAccessory.bind(this));
    this.deviceManager.on(Events.DEVICE_INFO_UPDATE, this.updateAccessoryInfo.bind(this));
    this.deviceManager.on(Events.DEVICE_STATUS_UPDATE, this.updateAccessoryStatus.bind(this));
    this.deviceManager.on(Events.DEVICE_DELETE, this.removeAccessory.bind(this));

  }

  addAccessory(device: TuyaDevice) {

    const uuid = this.api.hap.uuid.generate(device.id);
    const existingAccessory = this.cachedAccessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

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
      // this.log.debug('device:', device, 'accessory:', accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }

  updateAccessoryInfo(device: TuyaDevice, info) {
    const handler = this.getAccessoryHandler(device.id);
    if (!handler) {
      return;
    }

    handler.onDeviceInfoUpdate(device, info);
  }

  updateAccessoryStatus(device: TuyaDevice, status: []) {
    const handler = this.getAccessoryHandler(device.id);
    if (!handler) {
      return;
    }

    handler.onDeviceStatusUpdate(device, status);
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
