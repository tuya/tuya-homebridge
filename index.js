const TuyaOpenAPI = require("./lib/tuyaopenapi");
const TuyaOpenMQ = require("./lib/tuyamqttapi");
const OutletAccessory = require('./lib/outlet_accessory');
const LightAccessory = require('./lib/light_accessory');

var Accessory, Service, Characteristic;

module.exports = function (homebridge) {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  // registerAccessory' three parameters is plugin-name, accessory-name, constructor-name
  homebridge.registerPlatform('homebridge-tuya-platform', 'TuyaPlatform', TuyaPlatform, true);
}

// Accessory constructor
class TuyaPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    if (!config || !config.options) {
      this.log('No config found, disabling plugin.')
      return;
    }
    this.deviceAccessories = new Map();
    this.accessories = new Map();

    if (api) {
      // Save the API object as plugin needs to register new accessory via this object
      this.api = api;
      // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
      // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
      // Or start discover new accessories.
      this.api.on('didFinishLaunching', function () {
        this.log("Initializing TuyaPlatform...");
        this.initTuyaSDK(config);
      }.bind(this));
    }
  }

  async initTuyaSDK(config) {
    let api = new TuyaOpenAPI(
      config.options.endPoint,
      config.options.accessId,
      config.options.accessKey,
    );
    this.tuyaOpenApi = api;
    //login before everything start
    await api.login(config.options.username, config.options.password);
    //init Mqtt service and register some Listener
    let mq = new TuyaOpenMQ(api);
    this.tuyaOpenMQ = mq;
    this.tuyaOpenMQ.start();
    this.tuyaOpenMQ.addMessageListener(this.refreshDeviceStates.bind(this));
    let devices = await api.getDeviceList();
    for (const device of devices) {
      this.addAccessory(device);
    }
  }

  addAccessory(device) {
    var deviceType = device.category || 'dj';
    this.log.info('Adding: %s (%s / %s)', device.name || 'unnamed', deviceType, device.id);
    // Get UUID
    const uuid = this.api.hap.uuid.generate(device.id);
    const homebridgeAccessory = this.accessories.get(uuid);

    // Is device type overruled in config defaults?
    if (this.config.defaults) {
      for (const def of this.config.defaults) {
        if (def.id === device.id) {
          deviceType = def.device_type || deviceType;
          this.log('Device type is overruled in config to: ', deviceType);
        }
      }
    }

    // Construct new accessory
    let deviceAccessory;
    switch (deviceType) {
      case 'dj':
        deviceAccessory = new LightAccessory(this, homebridgeAccessory, device);
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      case 'cz':
        deviceAccessory = new OutletAccessory(this, homebridgeAccessory, device);
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      default:
        break;
    }

  }

  //refresh Accessorie status
  refreshDeviceStates(message) {
    const uuid = this.api.hap.uuid.generate(message.devId);
    const deviceAccessorie = this.deviceAccessories.get(uuid);
    if (deviceAccessorie) {
      deviceAccessorie.updateState(message);
    }
    else {
      this.log.error('Could not find accessory in dictionary');
    }
  }

  // Called from device classes
  registerPlatformAccessory(platformAccessory) {
    // this.log.debug('Register Platform Accessory (%s)', platformAccessory.displayName);
    this.api.registerPlatformAccessories('homebridge-tuya-platform', 'TuyaPlatform', [platformAccessory]);
  }

  // Function invoked when homebridge tries to restore cached accessory.
  // Developer can configure accessory at here (like setup event handler).
  // Update current value.
  configureAccessory(accessory) {
    this.log("Configuring cached accessory [%s]", accessory.displayName, accessory.context.deviceId, accessory.UUID);
    // Set the accessory to reachable if plugin can currently process the accessory,
    // otherwise set to false and update the reachability later by invoking 
    // accessory.updateReachability()
    accessory.reachable = true;
    accessory.on('identify', function (paired, callback) {
      // this.log.debug('[IDENTIFY][%s]', accessory.displayName);
      callback();
    });
    this.accessories.set(accessory.UUID, accessory);
  }

  // Sample function to show how developer can remove accessory dynamically from outside event
  removeAccessory(accessory) {
    this.log("Remove Accessory [%s]", accessory.displayName);
    this.api.unregisterPlatformAccessories("homebridge-tuya-platform", "TuyaPlatform", [accessory]);
    this.accessories.delete(accessory.uuid);
    this.deviceAccessories.delete(accessory.uuid);
  }
}
