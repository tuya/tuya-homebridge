import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { Validator } from 'jsonschema';
import path from 'path';
import fs from 'fs';

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

  validate() {
    let result;
    if (!this.options) {
      this.log.error('Not configured, exit.');
      return false;
    } else if (this.options.projectType === '1') {
      result = new Validator().validate(this.options, customOptionsSchema);
    } else if (this.options.projectType === '2') {
      result = new Validator().validate(this.options, homeOptionsSchema);
    } else {
      this.log.error(`Unsupported projectType: ${this.options['projectType']}, exit.`);
      return false;
    }
    result.errors.forEach(error => this.log.error(error.stack));
    if (result.errors.length > 0) {
      return false;
    }

    if (!this.validateDeviceOverrides() || !this.validateSchema()) {
      return false;
    }

    return true;
  }

  validateDeviceOverrides() {
    if (!this.options.deviceOverrides) {
      return true;
    }

    const idMap = new Map();
    for (const item of this.options.deviceOverrides) {
      if (idMap.has(item.id)) {
        idMap.get(item.id)?.push(item);
      } else {
        idMap.set(item.id, [item]);
      }
    }
    for (const items of idMap.values()) {
      if (items.length > 1) {
        this.log.error('"deviceOverrides" conflict, "id" must be unique: %o.', items);
        return false;
      }
    }
    return true;
  }

  validateSchema() {
    if (!this.options.deviceOverrides) {
      return true;
    }

    for (const deviceOverride of this.options.deviceOverrides) {
      if (!deviceOverride.schema) {
        continue;
      }
      const idMap = new Map();
      for (const item of deviceOverride.schema) {
        if (idMap.has(item.code)) {
          idMap.get(item.code)?.push(item);
        } else {
          idMap.set(item.code, [item]);
        }
      }
      for (const items of idMap.values()) {
        if (items.length > 1) {
          this.log.error('"schema" conflict, "code" must be unique: %o.', items);
          return false;
        }
      }
    }
    return true;
  }

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    if (!this.validate()) {
      return;
    }

    this.log.debug('Finished initializing platform');

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      this.log.debug('Executed didFinishLaunching callback');
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

    let devices: TuyaDevice[] | undefined;
    if (this.options.projectType === '1') {
      devices = await this.initCustomProject();
    } else if (this.options.projectType === '2') {
      devices = await this.initHomeProject();
    } else {
      this.log.warn(`Unsupported projectType: ${this.config.options.projectType}.`);
    }

    if (!devices || !this.deviceManager) {
      return;
    }

    // override device category
    for (const device of devices) {
      const deviceConfig = this.getDeviceConfig(device);
      if (!deviceConfig || !deviceConfig.category) {
        continue;
      }
      this.log.warn('Override %o category from %o to %o', device.name, device.category, deviceConfig.category);
      device.category = deviceConfig.category;
    }

    await this.deviceManager.updateInfraredRemotes(devices);

    this.log.info(`Got ${devices.length} device(s) and scene(s).`);
    const file = path.join(this.api.user.persistPath(), `TuyaDeviceList.${this.deviceManager.api.tokenInfo.uid}.json`);
    this.log.info('Device list saved at %s', file);
    if (!fs.existsSync(this.api.user.persistPath())) {
      await fs.promises.mkdir(this.api.user.persistPath());
    }
    await fs.promises.writeFile(file, JSON.stringify(devices, null, 2));

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

    this.deviceManager!.on(TuyaDeviceManager.Events.DEVICE_ADD, this.addAccessory.bind(this));
    this.deviceManager!.on(TuyaDeviceManager.Events.DEVICE_INFO_UPDATE, this.updateAccessoryInfo.bind(this));
    this.deviceManager!.on(TuyaDeviceManager.Events.DEVICE_STATUS_UPDATE, this.updateAccessoryStatus.bind(this));
    this.deviceManager!.on(TuyaDeviceManager.Events.DEVICE_DELETE, this.removeAccessory.bind(this));

  }

  getDeviceConfig(device: TuyaDevice) {
    if (!this.options.deviceOverrides) {
      return undefined;
    }

    const deviceConfig = this.options.deviceOverrides.find(config => config.id === device.id || config.id === device.uuid);
    const productConfig = this.options.deviceOverrides.find(config => config.id === device.product_id);
    const globalConfig = this.options.deviceOverrides.find(config => config.id === 'global');

    return deviceConfig || productConfig || globalConfig;
  }

  getDeviceSchemaConfig(device: TuyaDevice, code: string) {
    const deviceConfig = this.getDeviceConfig(device);
    if (!deviceConfig || !deviceConfig.schema) {
      return undefined;
    }

    // migrate old config
    deviceConfig.schema.forEach(item => {
      if (item['oldCode']) {
        item.newCode = item.code;
        item.code = item['oldCode'];
        item['oldCode'] = undefined;
      }
    });

    const schemaConfig = deviceConfig.schema.find(item => item.newCode ? item.newCode === code : item.code === code);
    if (!schemaConfig) {
      return undefined;
    }

    return schemaConfig;
  }

  async initCustomProject() {
    if (this.options.projectType !== '1') {
      return undefined;
    }

    const DEFAULT_USER = 'homebridge';
    const DEFAULT_PASS = 'homebridge';

    let res;
    const { endpoint, accessId, accessKey } = this.options;
    const api = new TuyaOpenAPI(endpoint, accessId, accessKey, this.log);
    const deviceManager = new TuyaCustomDeviceManager(api);

    this.log.info('Get token.');
    res = await api.getToken();
    if (res.success === false) {
      this.log.error(`Get token failed. code=${res.code}, msg=${res.msg}`);
      return undefined;
    }


    this.log.info(`Search default user "${DEFAULT_USER}"`);
    res = await api.customGetUserInfo(DEFAULT_USER);
    if (res.success === false) {
      this.log.error(`Search user failed. code=${res.code}, msg=${res.msg}`);
      return undefined;
    }


    if (!res.result.user_name) {
      this.log.info(`Default user "${DEFAULT_USER}" not exist.`);
      this.log.info(`Creating default user "${DEFAULT_USER}".`);
      res = await api.customCreateUser(DEFAULT_USER, DEFAULT_PASS);
      if (res.success === false) {
        this.log.error(`Create default user failed. code=${res.code}, msg=${res.msg}`);
        return undefined;
      }
    } else {
      this.log.info(`Default user "${DEFAULT_USER}" exists.`);
    }
    const uid = res.result.user_id;


    this.log.info('Fetching asset list.');
    res = await deviceManager.getAssetList();
    if (res.success === false) {
      this.log.error(`Fetching asset list failed. code=${res.code}, msg=${res.msg}`);
      return undefined;
    }

    const assetIDList: string[] = [];
    for (const { asset_id, asset_name } of res.result.list) {
      this.log.info(`Got asset_id=${asset_id}, asset_name=${asset_name}`);
      assetIDList.push(asset_id);
    }

    if (assetIDList.length === 0) {
      this.log.warn('Asset list is empty. exit.');
      return undefined;
    }


    this.log.info('Authorize asset list.');
    res = await deviceManager.authorizeAssetList(uid, assetIDList, true);
    if (res.success === false) {
      this.log.error(`Authorize asset list failed. code=${res.code}, msg=${res.msg}`);
      return undefined;
    }


    this.log.info(`Log in with user "${DEFAULT_USER}".`);
    res = await api.customLogin(DEFAULT_USER, DEFAULT_USER);
    if (res.success === false) {
      this.log.error(`Login failed. code=${res.code}, msg=${res.msg}`);
      if (LOGIN_ERROR_MESSAGES[res.code]) {
        this.log.error(LOGIN_ERROR_MESSAGES[res.code]);
      }
      return undefined;
    }

    this.log.info('Start MQTT connection.');
    deviceManager.mq.start();

    this.log.info('Fetching device list.');
    deviceManager.ownerIDs = assetIDList;
    const devices = await deviceManager.updateDevices(assetIDList);

    this.deviceManager = deviceManager;
    return devices;
  }

  async initHomeProject() {
    if (this.options.projectType !== '2') {
      return undefined;
    }

    let res;
    const { accessId, accessKey, countryCode, username, password, appSchema, endpoint } = this.options;
    const api = new TuyaOpenAPI(
      (endpoint && endpoint.length > 0) ? endpoint : TuyaOpenAPI.getDefaultEndpoint(countryCode),
      accessId,
      accessKey,
      this.log);
    const deviceManager = new TuyaHomeDeviceManager(api);

    this.log.info('Log in to Tuya Cloud.');
    res = await api.homeLogin(countryCode, username, password, appSchema);
    if (res.success === false) {
      this.log.error(`Login failed. code=${res.code}, msg=${res.msg}`);
      if (LOGIN_ERROR_MESSAGES[res.code]) {
        this.log.error(LOGIN_ERROR_MESSAGES[res.code]);
      }
      return undefined;
    }

    this.log.info('Start MQTT connection.');
    deviceManager.mq.start();

    this.log.info('Fetching home list.');
    res = await deviceManager.getHomeList();
    if (res.success === false) {
      this.log.error(`Fetching home list failed. code=${res.code}, msg=${res.msg}`);
      return undefined;
    }

    const homeIDList: number[] = [];
    for (const { home_id, name } of res.result) {
      this.log.info(`Got home_id=${home_id}, name=${name}`);
      if (this.options.homeWhitelist) {
        if (this.options.homeWhitelist.includes(home_id)) {
          this.log.info(`Found home_id=${home_id} in whitelist; including devices from this home.`);
          homeIDList.push(home_id);
        } else {
          this.log.info(`Did not find home_id=${home_id} in whitelist; excluding devices from this home.`);
        }
      } else {
        homeIDList.push(home_id);
      }
    }

    if (homeIDList.length === 0) {
      this.log.warn('Home list is empty.');
    }

    this.log.info('Fetching device list.');
    deviceManager.ownerIDs = homeIDList.map(homeID =>homeID.toString());
    const devices = await deviceManager.updateDevices(homeIDList);

    this.log.info('Fetching scene list.');
    for (const homeID of homeIDList) {
      const scenes = await deviceManager.getSceneList(homeID);
      for (const scene of scenes) {
        this.log.info(`Got scene_id=${scene.id}, name=${scene.name}`);
      }
      devices.push(...scenes);
    }

    this.deviceManager = deviceManager;
    return devices;
  }

  addAccessory(device: TuyaDevice) {
    if (device.category === 'hidden') {
      this.log.info('Hide Accessory:', device.name);
      return;
    }

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

    // this.log.debug('onDeviceInfoUpdate devId = %s, status = %o}', device.id, info);
    handler.onDeviceInfoUpdate(info);
  }

  updateAccessoryStatus(device: TuyaDevice, status: TuyaDeviceStatus[]) {
    const handler = this.getAccessoryHandler(device.id);
    if (!handler) {
      return;
    }

    // this.log.debug('onDeviceStatusUpdate devId = %s, status = %o}', device.id, status);
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
