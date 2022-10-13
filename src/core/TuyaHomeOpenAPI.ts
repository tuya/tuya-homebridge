import Crypto from 'crypto-js';
import TuyaOpenAPI, { Endpoints } from './TuyaOpenAPI';

export default class TuyaHomeOpenAPI extends TuyaOpenAPI {

  constructor(
    public endpoint: Endpoints,
    public accessId: string,
    public accessKey: string,
    public countryCode: string,
    public username: string,
    public password: string,
    public appSchema: string,
    public log,
    public lang = 'en',
  ) {
    super(endpoint, accessId, accessKey, log, lang);
  }

  async _refreshAccessTokenIfNeed(path: string) {

    if (path.startsWith('/v1.0/iot-01/associated-users/actions/authorized-login')) {
      return;
    }

    if (this.tokenInfo.expire - 60 * 1000 > new Date().getTime()) {
      return;
    }

    await this.login(this.appSchema, this.countryCode, this.username, this.password);

    return;
  }

  async login(appSchema: string, countryCode: string, username: string, password: string) {
    this.tokenInfo.access_token = '';
    const res = await this.post('/v1.0/iot-01/associated-users/actions/authorized-login', {
      'country_code': countryCode,
      'username': username,
      'password': Crypto.MD5(password).toString(),
      'schema': appSchema,
    });
    const { access_token, refresh_token, uid, expire_time, platform_url } = res.result;
    this.endpoint = platform_url || this.endpoint;

    this.tokenInfo = {
      access_token: access_token,
      refresh_token: refresh_token,
      uid: uid,
      expire: expire_time * 1000 + new Date().getTime(),
    };

    return res.result;
  }


  //Gets the list of devices under the associated user
  async getDevices() {
    const res = await this.get('/v1.0/iot-01/associated-users/devices', { 'size': 100 });

    const tempIds: string[] = [];
    for (let i = 0; i < res.result.devices.length; i++) {
      tempIds.push(res.result.devices[i].id);
    }
    const deviceIds = this._refactoringIdsGroup(tempIds, 20);
    const devicesFunctions: object[] = [];
    for (const ids of deviceIds) {
      const functions = await this.getDevicesFunctions(ids);
      devicesFunctions.push(functions);
    }
    let devices: object[] = [];
    if (devicesFunctions) {
      for (let i = 0; i < res.result.devices.length; i++) {
        const device = res.result.devices[i];
        const functions = devicesFunctions.find((item) => {
          const devices = item['devices'];
          if (!devices || devices.length === 0) {
            return false;
          }
          return devices[0] === device.id;
        });
        devices.push(Object.assign({}, device, functions));
      }
    } else {
      devices = res.result.devices;
    }

    return devices;
  }

  _refactoringIdsGroup(array: string[], subGroupLength: number) {
    let index = 0;
    const newArray: string[][] = [];
    while(index < array.length) {
      newArray.push(array.slice(index, index += subGroupLength));
    }
    return newArray;
  }

  // single device gets the instruction set
  async getDeviceFunctions(deviceID: string) {
    const res = await this.get(`/v1.0/devices/${deviceID}/functions`);
    return res.result;
  }

  // Batch access to device instruction sets
  async getDevicesFunctions(devIds: string[] = []) {
    const res = await this.get('/v1.0/devices/functions', { 'device_ids': devIds.join(',') });
    return res.result;
  }

  // Get individual device details
  async getDeviceInfo(deviceID: string) {
    const res = await this.get(`/v1.0/devices/${deviceID}`);
    return res.result;
  }

  // Batch access to device details
  async getDeviceListInfo(devIds: string[] = []) {
    if (devIds.length === 0) {
      return [];
    }
    const res = await this.get('/v1.0/devices', { 'device_ids': devIds.join(',') });
    return res.result.list;
  }

  // Gets the individual device state
  async getDeviceStatus(deviceID: string) {
    const res = await this.get(`/v1.0/devices/${deviceID}/status`);
    return res.result;
  }


  // Remove the device based on the device ID
  async removeDevice(deviceID: string) {
    const res = await this.delete(`/v1.0/devices/${deviceID}`);
    return res.result;
  }

  // sendCommand
  async sendCommand(deviceID: string, params) {
    const res = await this.post(`/v1.0/devices/${deviceID}/commands`, params);
    return res.result;
  }

}
