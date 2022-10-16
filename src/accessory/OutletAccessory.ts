import SwitchAccessory from './SwitchAccessory';

export default class OutletAccessory extends SwitchAccessory {
  public mainService = this.Service.Outlet;
}
