let PlatformAccessory;
let Accessory;
let Service;
let Characteristic;
let UUIDGen;

//Base class of Accessory
class BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig, categoryType) {
    this.platform = platform;
    this.deviceId = deviceConfig.id;
    this.categoryType = categoryType;
    PlatformAccessory = platform.api.platformAccessory;

    ({ Accessory, Service, Characteristic, uuid: UUIDGen } = platform.api.hap);

    this.log = platform.log;
    this.homebridgeAccessory = homebridgeAccessory;
    this.deviceConfig = deviceConfig;

    // Setup caching
    this.cachedState = new Map();
    this.validCache = false;

    //filter out Accessory Service
    this.serviceType;
    switch (categoryType) {
      case Accessory.Categories.LIGHTBULB:
        this.serviceType = Service.Lightbulb
        break;
      case Accessory.Categories.SWITCH:
        this.serviceType = Service.Switch;
        break;
      case Accessory.Categories.OUTLET:
        this.serviceType = Service.Outlet;
        break;
      case Accessory.Categories.FAN:
        this.serviceType = Service.Fanv2;
        break;
      default:
        this.serviceType = Service.AccessoryInformation;
    }

    //Accessory
    if (this.homebridgeAccessory) {
      this.homebridgeAccessory.controller = this;
      if (!this.homebridgeAccessory.context.deviceId) {
        this.homebridgeAccessory.context.deviceId = this.deviceConfig.id;
      }
      this.log.info(
        'Existing Accessory found [%s] [%s] [%s]',
        homebridgeAccessory.displayName,
        homebridgeAccessory.context.deviceId,
        homebridgeAccessory.UUID);
      this.homebridgeAccessory.displayName = this.deviceConfig.name;
    }
    else {
      // Create new Accessory
      this.log.info('Creating New Accessory %s', this.deviceConfig.id);
      this.homebridgeAccessory = new PlatformAccessory(
        this.deviceConfig.name,
        UUIDGen.generate(this.deviceConfig.id),
        categoryType);
      this.homebridgeAccessory.context.deviceId = this.deviceConfig.id;
      this.homebridgeAccessory.controller = this;
      this.platform.registerPlatformAccessory(this.homebridgeAccessory);
    }

    // Service
    this.service = this.homebridgeAccessory.getService(this.serviceType);
    if (this.service) {
      this.service.setCharacteristic(Characteristic.Name, this.deviceConfig.name);
    }
    else {
      // add new service
      this.service = this.homebridgeAccessory.addService(this.serviceType, this.deviceConfig.name);
    }

    this.homebridgeAccessory.on('identify', (paired, callback) => {
      callback();
    });
  }

  updateAccessory(device) {
    // Update general accessory information
    if (device.name) {
      this.homebridgeAccessory.displayName = device.name;
      this.homebridgeAccessory._associatedHAPAccessory.displayName = device.name;
      var accessoryInformationService = (
        this.homebridgeAccessory.getService(Service.AccessoryInformation) ||
        this.homebridgeAccessory.addService(Service.AccessoryInformation));
      var characteristicName = (
        accessoryInformationService.getCharacteristic(Characteristic.Name) ||
        accessoryInformationService.addCharacteristic(Characteristic.Name));
      if (characteristicName) {
        characteristicName.setValue(device.name);
      }
    }

    this.homebridgeAccessory.updateReachability(device.online);
    // Update device specific state
    this.updateState(device);
  }

  setCachedState(characteristic, value) {
    this.cachedState.set(characteristic, value);
    this.validCache = true;
  }

  getCachedState(characteristic) {
    return this.cachedState.get(characteristic);
  }

  hasValidCache() {
    return this.validCache && this.cachedState.size > 0;
  }

  invalidateCache() {
    this.validCache = false;
  }
}

module.exports = BaseAccessory;