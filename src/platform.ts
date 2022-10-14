import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import TuyaCustomOpenAPI from './core/TuyaCustomOpenAPI';
import TuyaHomeOpenAPI from './core/TuyaHomeOpenAPI';
import TuyaOpenMQ from './core/TuyaOpenMQ';
import TuyaDevice from './device/TuyaDevice';
import TuyaDeviceManager, { Events } from './device/TuyaDeviceManager';
import TuyaCustomDeviceManager from './device/TuyaCustomDeviceManager';
import TuyaHomeDeviceManager from './device/TuyaHomeDeviceManager';
import AccessoryFactory from './accessory/AccessoryFactory';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class TuyaPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  public deviceManager?: TuyaDeviceManager;
  public accessoryHandlers = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
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
    this.accessories.push(accessory);
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
    } = this.config.options;

    let devices: Set<TuyaDevice>;
    if (projectType === '1') {

      const api = new TuyaCustomOpenAPI(endpoint, accessId, accessKey, this.log);
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

      const api = new TuyaHomeOpenAPI(endpoint || TuyaHomeOpenAPI.Endpoints.AMERICA, accessId, accessKey, this.log);
      await api.login(countryCode, username, password, appSchema);

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

    for (const device of devices) {
      this.addAccessory(device);
    }

    this.deviceManager.on(Events.DEVICE_DELETE, this.removeAccessory.bind(this));
    this.deviceManager.on(Events.DEVICE_BIND, this.addAccessory.bind(this));
    this.deviceManager.on(Events.DEVICE_UPDATE, this.updateAccessory.bind(this));

  }

  addAccessory(device: TuyaDevice) {

    const existingAccessory = this.getAccessory(device.id);
    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

      // create the accessory handler for the restored accessory
      const handler = AccessoryFactory.createAccessory(this, existingAccessory, device);
      // this.accessoryHandlers.push(handler);

    } else {
      // the accessory does not yet exist, so we need to create it
      this.log.info('Adding new accessory:', device.name);

      // create a new accessory
      const uuid = this.api.hap.uuid.generate(device.id);
      const accessory = new this.api.platformAccessory(device.name, uuid);
      accessory.context.deviceID = device.id;

      // create the accessory handler for the newly create accessory
      const handler = AccessoryFactory.createAccessory(this, accessory, device);
      // this.accessoryHandlers.push(handler);

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }

  updateAccessory(device: TuyaDevice) {
    const accessory = this.getAccessory(device.id);
    if (!accessory) {
      return;
    }

    accessory.displayName = device.name;
  }

  removeAccessory(deviceID: string) {
    const accessory = this.getAccessory(deviceID);
    if (!accessory) {
      return;
    }

    const index = this.accessories.indexOf(accessory);
    if (index >= 0) {
      this.accessories.splice(index, 1);
    }

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    this.log.info('Removing existing accessory from cache:', accessory.displayName);
  }

  getAccessory(deviceID: string) {
    const uuid = this.api.hap.uuid.generate(deviceID);
    return this.accessories.find(accessory => accessory.UUID === uuid);
  }

}
