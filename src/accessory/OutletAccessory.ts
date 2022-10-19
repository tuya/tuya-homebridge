import SwitchAccessory from './SwitchAccessory';

export default class OutletAccessory extends SwitchAccessory {
  mainService() {
    return this.Service.Outlet;
  }
}
