import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import TuyaCustomOpenAPI from './core/TuyaCustomOpenAPI';
import TuyaHomeOpenAPI from './core/TuyaHomeOpenAPI';
import TuyaOpenMQ from './core/TuyaOpenMQ';
import TuyaDevice from './device/TuyaDevice';
import TuyaDeviceManager, { Events } from './device/TuyaDeviceManager';
import TuyaCustomDeviceManager from './device/TuyaCustomDeviceManager';
import TuyaHomeDeviceManager from './device/TuyaHomeDeviceManager';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class TuyaPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: Set<PlatformAccessory> = new Set();

  public tuyaDeviceManager?: TuyaDeviceManager;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.add(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices() {

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

      this.tuyaDeviceManager = new TuyaCustomDeviceManager(api, mq);
      try {
        devices = await this.tuyaDeviceManager.updateDevices();
      } catch (e) {
        this.log.warn('Failed to get device information. Please check if the config.json is correct.');
        return;
      }

    } else if (projectType === '2') {

      const api = new TuyaHomeOpenAPI(accessId, accessKey, countryCode, username, password, appSchema, this.log);

      const mq = new TuyaOpenMQ(api, '1.0', this.log);
      mq.start();

      this.tuyaDeviceManager = new TuyaHomeDeviceManager(api, mq);
      try {
        devices = await this.tuyaDeviceManager.updateDevices();
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

    this.tuyaDeviceManager.on(Events.DEVICE_DELETE, devId => {
      const uuid = this.api.hap.uuid.generate(devId);
      for (const accessory of this.accessories) {
        if (accessory.UUID === uuid) {
          this.removeAccessory(accessory);
        }
      }
    });

    this.tuyaDeviceManager.on(Events.DEVICE_BIND, device => {
      this.addAccessory(device);
    });

    this.tuyaDeviceManager.on(Events.DEVICE_UPDATE, device => {
      this.addAccessory(device);
    });

    /*
    // EXAMPLE ONLY
    // A real plugin you would discover accessories from the local network, cloud services
    // or a user-defined array in the platform config.
    const exampleDevices = [
      {
        exampleUniqueId: 'ABCD',
        exampleDisplayName: 'Bedroom',
      },
      {
        exampleUniqueId: 'EFGH',
        exampleDisplayName: 'Kitchen',
      },
    ];

    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of exampleDevices) {

      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(device.exampleUniqueId);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new TuyaPlatformAccessory(this, existingAccessory);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.exampleDisplayName);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.exampleDisplayName, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new TuyaPlatformAccessory(this, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
    */
  }

  addAccessory(device: TuyaDevice) {

    const uuid = this.api.hap.uuid.generate(device.devId);

    const existingAccessory = Array.from(this.accessories).find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

      // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
      existingAccessory.context.device = device;
      this.api.updatePlatformAccessories([existingAccessory]);

      // create the accessory handler for the restored accessory
      // this is imported from `platformAccessory.ts`
      // new TuyaPlatformAccessory(this, existingAccessory);
      // TODO

    } else {
      // the accessory does not yet exist, so we need to create it
      this.log.info('Adding new accessory:', device.name);

      // create a new accessory
      const accessory = new this.api.platformAccessory(device.name, uuid);

      // store a copy of the device object in the `accessory.context`
      // the `context` property can be used to store any data about the accessory you may need
      accessory.context.device = device;

      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      // new TuyaPlatformAccessory(this, accessory);

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }

  // Sample function to show how developer can remove accessory dynamically from outside event
  removeAccessory(accessory: PlatformAccessory) {
    this.accessories.delete(accessory);
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    this.log.info('Removing existing accessory from cache:', accessory.displayName);
  }

}
