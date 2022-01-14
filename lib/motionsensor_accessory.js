const BaseAccessory = require("./base_accessory");

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

class MotionSensorAccessory extends BaseAccessory {
  constructor(platform, homebridgeAccessory, deviceConfig, overrideTime) {
    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.SENSOR,
      Service.MotionSensor
    );
    this.statusArr = deviceConfig.status;
    this.overrideTime = overrideTime;

    let timePir = this.statusArr.find(p => { return p.code === "pir_time" });
    if (timePir != null)
      this.timeSensor = true;
    else
      this.timeSensor = false;

    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    let status;
    this.isRefresh = isRefresh;
    if (!isRefresh)
      this.getAccessoryCharacteristic(this.service);
    for (var statusMap of statusArr) {
      if (statusMap.code === "pir") {

        let rawStatus = statusMap.value;
        switch (rawStatus) {
          case "pir":
            status = true;
            break;
          default:
            status = false;
            break;
        }
        this.setCachedState(Characteristic.MotionDetected, status);
        if (this.isRefresh) {
          if (this.overrideTime > 0 && !this.timeSensor) {
            if (this.freezeDiscovery === true)
              return;
            this.freezeStatus(status)
          }
          else
            this.service.getCharacteristic(Characteristic.MotionDetected)
              .updateValue(status);
        } else {
          this.freezeDiscovery = false;

        }
      }

      if (statusMap.code === "battery_percentage" || statusMap.code === "battery_value" || statusMap.code === "battery_state") {
        let rawStatus = statusMap.value;
        switch (true) {
          case statusMap.code === "battery_percentage":
            if (rawStatus > 20)
              status = 0;
            else
              status = 1;
            break;
          case statusMap.code === "battery_value":
            if (rawStatus > 2000)
              status = 0;
            else
              status = 1;
            break;
          case statusMap.code === "battery_state":
            if (rawStatus === "high" || rawStatus === "middle")
              status = 0;
            else
              status = 1;
            break;
        }
        this.setCachedState(Characteristic.StatusLowBattery, status);
        if (this.isRefresh) {
          this.service
            .getCharacteristic(Characteristic.StatusLowBattery)
            .updateValue(status);
        }
      }

      if (statusMap.code === "temper_alarm") {
        let rawStatus = statusMap.value;
        this.setCachedState(Characteristic.StatusTampered, rawStatus);
        if (this.isRefresh)
          this.service
            .getCharacteristic(Characteristic.StatusTampered)
            .updateValue(rawStatus);

      }
    }
  }

  getAccessoryCharacteristic(service) {
    //get events

    service.getCharacteristic(Characteristic.MotionDetected)
      .onGet(async => {
        return this.freezeDiscovery != null ? this.freezeDiscovery : false;
      });

    service.getCharacteristic(Characteristic.StatusLowBattery)
      .onGet(this.handleStatusLowBatteryGet.bind(this));

    service.getCharacteristic(Characteristic.StatusTampered)
      .onGet(this.handleStatusTamperedGet.bind(this));

  }

  handleStatusLowBatteryGet() {
    if (this.hasValidCache() && this.getCachedState(Characteristic.StatusLowBattery) != null)
      return this.getCachedState(Characteristic.StatusLowBattery);
    return Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

  }

  handleStatusTamperedGet() {
    if (this.hasValidCache() && this.getCachedState(Characteristic.StatusTampered) != null)
      return this.getCachedState(Characteristic.StatusTampered);
    return Characteristic.StatusTampered.NOT_TAMPERED;
  }
  //update device status
  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }

  freezeStatus(value) {
    if (value === true) {
      this.freezeDiscovery = true;
      this.service.getCharacteristic(Characteristic.MotionDetected)
        .updateValue(this.freezeDiscovery);

      let timeoutId = setTimeout(() => {

        this.freezeDiscovery = false;
        this.service.getCharacteristic(Characteristic.MotionDetected)
          .updateValue(this.freezeDiscovery);
      }, 1000 * this.overrideTime);
    }



  }
}

module.exports = MotionSensorAccessory;