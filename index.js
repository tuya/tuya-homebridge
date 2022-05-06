const TuyaOpenAPI = require("./lib/tuyaopenapi");
const TuyaSHOpenAPI = require("./lib/tuyashopenapi");
const TuyaOpenMQ = require("./lib/tuyamqttapi");
const OutletAccessory = require("./lib/outlet_accessory");
const LightAccessory = require("./lib/light_accessory");
const SwitchAccessory = require("./lib/switch_accessory");
const SmokeSensorAccessory = require("./lib/smokesensor_accessory");
const Fanv2Accessory = require("./lib/fanv2_accessory");
const HeaterAccessory = require("./lib/heater_accessory");
const GarageDoorAccessory = require("./lib/garagedoor_accessory");
const AirPurifierAccessory = require("./lib/air_purifier_accessory");
const WindowCoveringAccessory = require("./lib/window_covering_accessory");
const DoorAccessory = require("./lib/door_accessory");
const ContactSensorAccessory = require("./lib/contactsensor_accessory");
const WirelessSwitchAccessory = require("./lib/wirelessswitch_accessory");

const LogUtil = require("./util/logutil");
const DataUtil = require("./util/datautil");

var Accessory, Service, Characteristic, mSpecifiedAccessoryType;

module.exports = function (homebridge) {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  // registerAccessory' three parameters is plugin-name, accessory-name, constructor-name
  homebridge.registerPlatform(
    "homebridge-tuya-platform",
    "TuyaPlatform",
    TuyaPlatform,
    true
  );
};

// Accessory constructor
class TuyaPlatform {
  constructor(log, config, api) {
    this.log = new LogUtil(config.options.debug);
    this.config = config;
    if (!config || !config.options) {
      this.log.log("The config configuration is incorrect, disabling plugin.");
      return;
    }
    mSpecifiedAccessoryType = config.options.accessoryType;
    if (mSpecifiedAccessoryType && Array.isArray(mSpecifiedAccessoryType)) {
      this.log.log(
        "mSpecifiedAccessoryType: ",
        JSON.stringify(mSpecifiedAccessoryType)
      );
    } else {
      mSpecifiedAccessoryType = undefined;
    }
    this.deviceAccessories = new Map();
    this.accessories = new Map();

    if (api) {
      // Save the API object as plugin needs to register new accessory via this object
      this.api = api;
      // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
      // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
      // Or start discover new accessories.
      this.api.on(
        "didFinishLaunching",
        function () {
          this.log.log("Initializing TuyaPlatform...");
          this.initTuyaSDK(config);
        }.bind(this)
      );
    }
  }

  async initTuyaSDK(config) {
    let devices;
    let api;
    if (config.options.projectType == "1") {
      api = new TuyaOpenAPI(
        config.options.endPoint,
        config.options.accessId,
        config.options.accessKey,
        this.log
      );
      this.tuyaOpenApi = api;
      //login before everything start
      await api.login(config.options.username, config.options.password);
      //init Mqtt service and register some Listener
      try {
        devices = await api.getDeviceList();
      } catch (e) {
        // this.log.log(JSON.stringify(e.message));
        this.log.log(
          "Failed to get device information. Please check if the config.json is correct."
        );
        return;
      }
    } else {
      api = new TuyaSHOpenAPI(
        config.options.accessId,
        config.options.accessKey,
        config.options.username,
        config.options.password,
        config.options.countryCode,
        config.options.appSchema,
        this.log
      );
      this.tuyaOpenApi = api;

      try {
        devices = await api.getDevices();
      } catch (e) {
        // this.log.log(JSON.stringify(e.message));
        this.log.log(
          "Failed to get device information. Please check if the config.json is correct."
        );
        return;
      }
    }

    let disableDevice = config.options.disabledDevice;
    for (const device of devices) {
      let isDeviceDisabled = false;
      if (
        disableDevice &&
        disableDevice.length > 0 &&
        disableDevice.filter((item) => {
          return item.id == device.id;
        }).length > 0
      ) {
        isDeviceDisabled = true;
      }
      if (config.options.listDeviceId) {
        console.log(
          "id: %s, name: %s%s",
          device.id,
          device.name,
          isDeviceDisabled ? " [DISABLED]" : ""
        );
      }
      if (!isDeviceDisabled) {
        this.addAccessory(device);
      } else {
        const uuid = this.api.hap.uuid.generate(device.id);
        const accessory = this.accessories.get(uuid);
        this.removeAccessory(accessory);
      }
    }

    const type = config.options.projectType == "1" ? "2.0" : "1.0";
    let mq = new TuyaOpenMQ(api, type, this.log);
    this.tuyaOpenMQ = mq;
    this.tuyaOpenMQ.start();
    this.tuyaOpenMQ.addMessageListener(this.onMQTTMessage.bind(this));
  }

  addAccessory(device) {
    var deviceType = device.category;
    if (mSpecifiedAccessoryType && mSpecifiedAccessoryType.length > 0) {
      const specifiedDevice = mSpecifiedAccessoryType.filter((item) => {
        return item.id == device.id;
      });
      if (specifiedDevice.length > 0) {
        deviceType = specifiedDevice[0].type;
      }
    }
    this.log.log(
      `Adding: ${device.name || "unnamed"} (${deviceType} / ${device.id})`
    );
    // Get UUID
    const uuid = this.api.hap.uuid.generate(device.id);
    const homebridgeAccessory = this.accessories.get(uuid);

    // Construct new accessory
    let deviceAccessory;
    switch (deviceType) {
      case "kj":
      case "AirPurifier":
        deviceAccessory = new AirPurifierAccessory(
          this,
          homebridgeAccessory,
          device
        );
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      case "dj":
      case "dd":
      case "fwd":
      case "tgq":
      case "xdd":
      case "dc":
      case "tgkg":
      case "Light":
        deviceAccessory = new LightAccessory(this, homebridgeAccessory, device);
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      case "cz":
      case "pc":
      case "Outlet":
        var deviceData = new DataUtil().getSubService(device.status);
        deviceAccessory = new OutletAccessory(
          this,
          homebridgeAccessory,
          device,
          deviceData
        );
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      case "kg":
      case "tdq":
      case "Switch":
        var deviceData = new DataUtil().getSubService(device.status);
        deviceAccessory = new SwitchAccessory(
          this,
          homebridgeAccessory,
          device,
          deviceData
        );
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      case "fs":
      case "fskg":
      case "Fanv2":
        deviceAccessory = new Fanv2Accessory(this, homebridgeAccessory, device);
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      case "ywbj":
      case "SmokeSensor":
        deviceAccessory = new SmokeSensorAccessory(
          this,
          homebridgeAccessory,
          device
        );
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      case "qn":
      case "Heater":
        deviceAccessory = new HeaterAccessory(
          this,
          homebridgeAccessory,
          device
        );
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      case "ckmkzq": //garage_door_opener
      case "GarageDoor":
        deviceAccessory = new GarageDoorAccessory(
          this,
          homebridgeAccessory,
          device
        );
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      case "cl":
      case "WindowCovering":
        deviceAccessory = new WindowCoveringAccessory(
          this,
          homebridgeAccessory,
          device
        );
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      case "mcs":
      case "ContactSensor":
        deviceAccessory = new ContactSensorAccessory(
          this,
          homebridgeAccessory,
          device
        );
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      case "rqbj":
      case "jwbj":
      case "LeakSensor":
        deviceAccessory = new LeakSensorAccessory(
          this,
          homebridgeAccessory,
          device
        );
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      case "wxkg":
      case "WirelessSwitch":
        var deviceData = new DataUtil().getSubService(
          device.status,
          deviceType
        );
        deviceAccessory = new WirelessSwitchAccessory(
          this,
          homebridgeAccessory,
          device,
          deviceData
        );
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      case "Door":
        deviceAccessory = new DoorAccessory(this, homebridgeAccessory, device);
        this.accessories.set(uuid, deviceAccessory.homebridgeAccessory);
        this.deviceAccessories.set(uuid, deviceAccessory);
        break;
      default:
        break;
    }
  }

  //Handle device deletion, addition, status update
  async onMQTTMessage(message) {
    if (message.bizCode) {
      if (message.bizCode == "delete") {
        const uuid = this.api.hap.uuid.generate(message.devId);
        const homebridgeAccessory = this.accessories.get(uuid);
        this.removeAccessory(homebridgeAccessory);
      } else if (message.bizCode == "bindUser") {
        let deviceInfo = await this.tuyaOpenApi.getDeviceInfo(
          message.bizData.devId
        );
        let functions = await this.tuyaOpenApi.getDeviceFunctions(
          message.bizData.devId
        );
        let device = Object.assign(deviceInfo, functions);
        this.addAccessory(device);
      }
    } else {
      this.refreshDeviceStates(message);
    }
  }

  //refresh Accessorie status
  async refreshDeviceStates(message) {
    const uuid = this.api.hap.uuid.generate(message.devId);
    const deviceAccessorie = this.deviceAccessories.get(uuid);
    if (deviceAccessorie) {
      deviceAccessorie.updateState(message);
    }
  }

  // Called from device classes
  registerPlatformAccessory(platformAccessory) {
    this.log.log(
      `Register Platform Accessory ${platformAccessory.displayName}`
    );
    this.api.registerPlatformAccessories(
      "homebridge-tuya-platform",
      "TuyaPlatform",
      [platformAccessory]
    );
  }

  // Function invoked when homebridge tries to restore cached accessory.
  // Developer can configure accessory at here (like setup event handler).
  // Update current value.
  configureAccessory(accessory) {
    // this.log("Configuring cached accessory [%s]", accessory.displayName, accessory.context.deviceId, accessory.UUID);
    // Set the accessory to reachable if plugin can currently process the accessory,
    // otherwise set to false and update the reachability later by invoking
    // accessory.updateReachability()
    accessory.reachable = true;
    accessory.on("identify", function (paired, callback) {
      // this.log.debug('[IDENTIFY][%s]', accessory.displayName);
      callback();
    });
    this.accessories.set(accessory.UUID, accessory);
  }

  // Sample function to show how developer can remove accessory dynamically from outside event
  removeAccessory(accessory) {
    if (accessory) {
      this.log.log(`Remove Accessory ${accessory}`);
      this.api.unregisterPlatformAccessories(
        "homebridge-tuya-platform",
        "TuyaPlatform",
        [accessory]
      );
      this.accessories.delete(accessory.uuid);
      this.deviceAccessories.delete(accessory.uuid);
    }
  }
}
