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

  async updateDevices() {

    const res = await this.getHomeList();
    if (!res.success) {
      return [];
    }

    let devices: TuyaDevice[] = [];
    for (const { home_id } of res.result) {
      const res = await this.getHomeDeviceList(home_id);
      devices = devices.concat((res.result as []).map(obj => new TuyaDevice(obj)));
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
