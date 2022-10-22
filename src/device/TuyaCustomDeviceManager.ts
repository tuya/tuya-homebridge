import TuyaDevice, { TuyaDeviceFunction } from './TuyaDevice';
import TuyaDeviceManager from './TuyaDeviceManager';

export default class TuyaCustomDeviceManager extends TuyaDeviceManager {

  async getAssetList() {
    const res = await this.api.get('/v1.0/iot-03/users/assets', {
      'page_no': 0,
      'page_size': 100,
    });
    return res;
  }

  async getAssetDeviceIDList(assetID: string) {
    let deviceIDs: string[] = [];
    const params = {
      page_size: 50,
    };
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await this.api.get(`/v1.0/iot-02/assets/${assetID}/devices`, params);
      deviceIDs = deviceIDs.concat((res.result.list as []).map(item => item['device_id']));
      params['last_row_key'] = res.result.last_row_key;
      if (!res.result.has_next) {
        break;
      }
    }

    return deviceIDs;
  }

  async updateDevices() {

    let res;

    res = await this.getAssetList();
    if (!res.success) {
      return [];
    }

    let deviceIDs: string[] = [];
    for (const asset of res.result.assets) {
      deviceIDs = deviceIDs.concat(await this.getAssetDeviceIDList(asset.asset_id));
    }
    if (deviceIDs.length === 0) {
      return [];
    }

    res = await this.getDeviceListInfo(deviceIDs);
    const devices = (res.result.devices as []).map(obj => new TuyaDevice(obj));
    const functions = await this.getDeviceListFunctions(deviceIDs);

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
