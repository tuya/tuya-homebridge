import TuyaDevice, { TuyaDeviceFunction } from './TuyaDevice';
import TuyaDeviceManager from './TuyaDeviceManager';

export default class TuyaHomeDeviceManager extends TuyaDeviceManager {

  async getHomeList() {
    const res = await this.api.get(`/v1.0/users/${this.api.tokenInfo.uid}/homes`);
    return res;
  }

  async getHomeDeviceList(homeID: number) {
    const res = await this.api.get(`/v1.0/homes/${homeID}/devices`);
    return res;
  }

  async updateDevices(homeIDList: number[]) {

    let devices: TuyaDevice[] = [];
    for (const homeID of homeIDList) {
      const res = await this.getHomeDeviceList(homeID);
      devices = devices.concat((res.result as []).map(obj => new TuyaDevice(obj)));
    }
    if (devices.length === 0) {
      return [];
    }

    const devIds: string[] = [];
    for (const device of devices) {
      devIds.push(device.id);
    }

    const functions = await this.getDeviceListFunctions(devIds);

    for (const device of devices) {
      for (const item of functions) {
        if (device.product_id === item['product_id']) {
          device.functions = item['functions'] as TuyaDeviceFunction[];
          break;
        }
      }
      device.functions = device.functions || [];
    }

    this.devices = devices;
    return devices;
  }

}
