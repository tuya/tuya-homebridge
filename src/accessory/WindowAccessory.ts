import WindowCoveringAccessory from './WindowCoveringAccessory';

export default class WindowAccessory extends WindowCoveringAccessory {

  mainService() {
    return this.accessory.getService(this.Service.Window)
      || this.accessory.addService(this.Service.Window);
  }

  addBatteryService() {

    const service = this.accessory.getService(this.Service.Battery)
      || this.accessory.addService(this.Service.Battery);

    if (this.device.getDeviceStatus('residual_electricity')) {
      service.getCharacteristic(this.Characteristic.StatusLowBattery)
        .onGet(() => {
          const status = this.device.getDeviceStatus('residual_electricity');
          return (status?.value as number <= 20) ?
            this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW :
            this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        });

      service.getCharacteristic(this.Characteristic.BatteryLevel)
        .onGet(() => {
          const status = this.device.getDeviceStatus('residual_electricity');
          let percent = Math.max(0, status!.value as number);
          percent = Math.min(100, percent);
          return percent;
        });
    }

    if (this.device.getDeviceStatus('charge_state')) {
      service.getCharacteristic(this.Characteristic.ChargingState)
        .onGet(() => {
          const status = this.device.getDeviceStatus('charge_state');
          return (status?.value as boolean) ?
            this.Characteristic.ChargingState.CHARGING :
            this.Characteristic.ChargingState.NOT_CHARGING;
        });
    }
  }

  getWorkState() {
    return undefined;
  }

}
