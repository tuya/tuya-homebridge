const BaseAccessory = require('./base_accessory');
const SwitchAccessory = require('./switch_accessory');

let Accessory;
let Service;
let Characteristic;
let UUIDGen;


class ValveAccessory extends BaseAccessory {

  constructor(platform, homebridgeAccessory, deviceConfig, deviceData) {
    ({ Accessory, Characteristic, Service } = platform.api.hap);
    super(
      platform,
      homebridgeAccessory,
      deviceConfig,
      Accessory.Categories.SWITCH,
      Service.Valve,
      deviceData.subType
    );
    this.statusArr = deviceConfig.status;
    this.subTypeArr = deviceData.subType;
    this.refreshAccessoryServiceIfNeed(this.statusArr, false);
  }

  //init Or refresh AccessoryService
  refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
    if (!statusArr)
      return;

    let service;
    let subtype;

    this.isRefresh = isRefresh;


    for (var statusItem of statusArr) {

      if (statusItem.code.includes('switch')) {
        var value = statusItem.value;

        if (this.subTypeArr.length == 1) {
          service = this.service;
          this.switchValue = statusItem;
        }
        else
          service = this.homebridgeAccessory.getService(statusItem.code);

        subtype = this.getSubType(service);
        this.setCachedState(service.displayName, value);

        if (this.isRefresh) {
          service
            .getCharacteristic(this.platform.api.hap.Characteristic.Active)
            .updateValue(value);
          service
            .getCharacteristic(this.platform.api.hap.Characteristic.InUse)
            .updateValue(value);
          service
            .getCharacteristic(this.platform.api.hap.Characteristic.ValveType)
            .updateValue(0);

        }
        else {
          //register all events.
          this.getAccessoryCharacteristic(service)

          service.getCharacteristic(Characteristic.SetDuration)
            .setProps({
              format: Characteristic.Formats.UINT32,
              maxValue: 86340,
              minValue: 0,
              minStep: 60,
              perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
            });

          service.getCharacteristic(Characteristic.RemainingDuration)
            .setProps({
              maxValue: 86340,
              minValue: 0,
              minStep: 1
            });
        }

      }
      if (statusItem.code.includes('countdown')) {

        if (this.subTypeArr.length == 1) {
          service = this.service;
        }
        else
          service = this.homebridgeAccessory.getService('switch_' + statusItem.code.slice(-1));

        subtype = this.getSubType(service);

        if (this.hasValidCache()) {
          //if homebridge instance was killed and boiler is runing with time - restore time left.
          if (this.getCachedState(statusItem.code) == null && statusItem.value > 1) {
            service.startTime = new Date().getTime();
            service.duration = statusItem.value;
          }
          service
            .getCharacteristic(this.platform.api.hap.Characteristic.RemainingDuration)
            .getValue();
        }
      }
      if (!statusItem) {
        continue;
      }



    }
  }


  getAccessoryCharacteristic(service) {

    //Get Events
    service.getCharacteristic(Characteristic.RemainingDuration)
      .onGet(async () => {
        const subtype = this.getSubType(service);

        if (service.startTime != null && service.duration > 0) {
          let setTime = service.duration; //this.getCachedState('countdown_' + subtype.slice(-1));
          setTime = setTime * 1000;
          return (service.startTime - new Date().getTime() + setTime) / 1000;
        }
        return 0;
      });

    service.getCharacteristic(Characteristic.Active)
      .onGet(async () => {
        const state = this.getCachedState(service.displayName);

        if (state !== null)
          return state == (true || 1) ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
        return this.switchValue.value ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;

      })
    service.getCharacteristic(Characteristic.InUse)
      .onGet(async () => {
        const state = this.getCachedState(service.displayName);
        if (state !== null)
          return state == (true || 1) ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE;
        return this.switchValue.value ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE;
      })

    service.getCharacteristic(Characteristic.SetDuration)
      .onGet(async () => {
        return service.duration == null ? 0 : service.duration;
      })

    //set events
    service.getCharacteristic(Characteristic.SetDuration)
      .onSet(async (value) => {
        let name;
        service.lastDuration = value;
        const subtype = this.getSubType(service);

        if (this.subTypeArr.length == 1)
          name = service.displayName;
        else
          name = subtype;

        if (this.hasValidCache() && (this.getCachedState('countdown_' + subtype.slice(-1)) || value > 0) > 0 && this.getCachedState(name) == (true || 1)) {
          this.setCachedState('countdown_' + subtype.slice(-1), value);

          const param = this.getSendParam(service.displayName,null,service);
          await this.platform.tuyaOpenApi.sendCommand(this.deviceId, param);
          service.duration = value;

          if (value == 0)
            service.startTime = null;
          else
            service.startTime = new Date().getTime();
          this.updateHomeKit(service);
        }
        else {
          this.setCachedState('countdown_' + subtype.slice(-1), value);
          service.duration = value;
        }
      });

    service.getCharacteristic(Characteristic.Active)
      .onSet(async (value) => {
        let param = '';
        const subtype = this.getSubType(service);

        if (value == Characteristic.Active.INACTIVE)
          this.modifyCountdown(subtype,service);
        else
          if (service.lastDuration != null){
            await service.getCharacteristic(Characteristic.SetDuration).setValue(service.lastDuration);
          }
        param = this.getSendParam(service.displayName, value,service);
        await this.platform.tuyaOpenApi.sendCommand(this.deviceId, param);
        service.startTime = new Date().getTime();
        this.setCachedState(service.displayName, value);
        this.updateHomeKit(service);
      })
  }

  //get Command SendData
  getSendParam(name, value,service) {
    let arr = [];
    let code;

    const isOn = value ? true : false;
    if (this.subTypeArr.length == 1) {
      code = this.switchValue.code;
    } else {
      code = name;
    }
    //value = isOn;
    if (value != null)
      arr.push({ 'code': code, 'value': isOn });

    if (!isOn && service !== null)
      service.duration = 0;

    if (this.hasValidCache()) {

      this.cachedState.forEach((val, key) => {

        if (key.includes('countdown'))
          arr.push({ "code": key, "value": val });
      });

    }
    return {
      "commands": arr
    };
  }

  modifyCountdown(subtype,service) {
    if (this.hasValidCache()) {
      this.cachedState.forEach((val, key) => {
        if (key.includes('countdown')) {
          this.cachedState.set(key, 0);
          service.startTime = null;
          service.duration = 0;
        }
      });
    }
  }

  //update device status
  updateState(data) {
    this.refreshAccessoryServiceIfNeed(data.status, true);
  }

  //update homekit
  updateHomeKit(service) {
    service
      .getCharacteristic(this.platform.api.hap.Characteristic.RemainingDuration)
      .getValue();
    service
      .getCharacteristic(this.platform.api.hap.Characteristic.Active)
      .getValue();
    service
      .getCharacteristic(this.platform.api.hap.Characteristic.InUse)
      .getValue();
  }

  getSubType(service) {
    let subtype;

    if (this.subTypeArr.length == 1)
      subtype = this.subTypeArr[0];
    else
      subtype = service.subtype;

    return subtype;
  }

}
module.exports = ValveAccessory;