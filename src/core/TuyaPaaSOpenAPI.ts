import Crypto from 'crypto-js';
import TuyaOpenAPI from './TuyaOpenAPI';

export default class TuyaPaaSOpenAPI extends TuyaOpenAPI {

  async _refreshAccessTokenIfNeed(path: string) {
    if (this.isLogin() === false) {
      return;
    }

    if (path.startsWith('/v1.0/token')) {
      return;
    }

    if (this.tokenInfo.expire - 60 * 1000 > new Date().getTime()) {
      return;
    }

    this.tokenInfo.access_token = '';
    const res = await this.get(`/v1.0/token/${this.tokenInfo.refresh_token}`);
    const { access_token, refresh_token, uid, expire } = res.result;
    this.tokenInfo = {
      access_token: access_token,
      refresh_token: refresh_token,
      uid: uid,
      expire: expire * 1000 + new Date().getTime(),
    };

    return;
  }

  async login(username: string, password: string) {
    const res = await this.post('/v1.0/iot-03/users/login', {
      'username': username,
      'password': Crypto.SHA256(password).toString().toLowerCase(),
    });
    const { access_token, refresh_token, uid, expire } = res.result;

    this.tokenInfo = {
      access_token: access_token,
      refresh_token: refresh_token,
      uid: uid,
      expire: expire + new Date().getTime(),
    };

    return res.result;
  }

  // Get all devices
  async getDeviceList() {
    const assets = await this.getAssets();

    let deviceDataArr = [];
    const deviceIdArr = [];
    for (const asset of assets) {
      const res = await this.getDeviceIDList(asset.asset_id);
      deviceDataArr = deviceDataArr.concat(res);
    }

    for (const deviceData of deviceDataArr) {
      const { device_id } = deviceData;
      deviceIdArr.push(device_id);
    }

    const devicesInfoArr = await this.getDeviceListInfo(deviceIdArr);
    const devicesStatusArr = await this.getDeviceListStatus(deviceIdArr);

    const devices: unknown[] = [];
    for (let i = 0; i < devicesInfoArr.length; i++) {
      const info = devicesInfoArr[i];
      const functions = await this.getDeviceFunctions(info.id);
      const status = devicesStatusArr.find((j) => j.id === info.id);
      devices.push(Object.assign({}, info, functions, status));
    }
    return devices;
  }

  // Gets a list of human-actionable assets
  async getAssets() {
    const res = await this.get('/v1.0/iot-03/users/assets', {
      'parent_asset_id': null,
      'page_no': 0,
      'page_size': 100,
    });
    return res.result.assets;
  }

  // Query the list of device IDs under the asset
  async getDeviceIDList(assetID: string) {
    const res = await this.get(`/v1.0/iot-02/assets/${assetID}/devices`);
    return res.result.list;
  }

  // Gets the device instruction set
  async getDeviceFunctions(deviceID: string) {
    const res = await this.get(`/v1.0/iot-03/devices/${deviceID}/functions`);
    return res.result;
  }

  // Get individual device information
  async getDeviceInfo(deviceID: string) {
    const res = await this.get(`/v1.0/iot-03/devices/${deviceID}`);
    return res.result;
  }

  // Batch access to device information
  async getDeviceListInfo(devIds: string[] = []) {
    if (devIds.length === 0) {
      return [];
    }
    const res = await this.get('/v1.0/iot-03/devices', { 'device_ids': devIds.join(',') });
    return res.result.list;
  }

  // Gets the individual device state
  async getDeviceStatus(deviceID: string) {
    const res = await this.get(`/v1.0/iot-03/devices/${deviceID}/status`);
    return res.result;
  }

  // Batch access to device status
  async getDeviceListStatus(devIds: string[] = []) {
    if (devIds.length === 0) {
      return [];
    }
    const res = await this.get('/v1.0/iot-03/devices/status', { 'device_ids': devIds.join(',') });
    return res.result;
  }

  async sendCommand(deviceID: string, params) {
    const res = await this.post(`/v1.0/iot-03/devices/${deviceID}/commands`, params);
    return res.result;
  }

}
