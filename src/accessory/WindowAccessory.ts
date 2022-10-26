import WindowCoveringAccessory from './WindowCoveringAccessory';

export default class WindowAccessory extends WindowCoveringAccessory {
  mainService() {
    return this.accessory.getService(this.Service.Window)
      || this.accessory.addService(this.Service.Window);
  }
}
