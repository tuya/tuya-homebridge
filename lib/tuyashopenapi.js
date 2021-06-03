const axios = require('axios').default;
const Crypto = require('crypto-js');

class TuyaSHOpenAPI {

  constructor(endpoint, accessId, accessKey, username, password, countryCode, appSchema, log, lang = 'en') {
    this.endpoint = endpoint;
    this.access_id = accessId;
    this.access_key = accessKey;
    this.lang = lang;
    this.username = username;
    this.password = password;
    this.countryCode = countryCode;
    this.appSchema = appSchema;
    this.log = log;

    this.assetIDArr = new Array();
    this.deviceArr = new Array();

    this.tokenInfo = {
      access_token: '',
      refresh_token: '',
      uid: '',
      expire: 0,
    }
  }

  async _refreshAccessTokenIfNeed(path) {

    if (path.startsWith('/v1.0/iot-01/associated-users/actions/authorized-login')) {
      return;
    }

    if (this.tokenInfo.expire - 60 * 1000 > new Date().getTime()) {
      return;
    }

    this.tokenInfo.access_token = '';
    const md5pwd = Crypto.MD5(this.password).toString();
    let res = await this.post(`/v1.0/iot-01/associated-users/actions/authorized-login`, {
      'country_code' : this.countryCode,
      'username': this.username,
      'password': md5pwd,
      'schema' : this.appSchema
    });
    let {access_token, refresh_token, uid, expire_time} = res.result;
    this.tokenInfo = {
      access_token: access_token,
      refresh_token: refresh_token,
      uid: uid,
      expire: expire_time *1000 + new Date().getTime(),
    };

    return;
  }

  //获取关联用户下设备列表
  async getDevices() {
    let res = await this.get(`/v1.0/iot-01/associated-users/devices`);

    let deviceIds = [];
    for (let i = 0; i < res.result.devices.length; i++) {
      deviceIds.push(res.result.devices[i].id)
    }
    
    let devicesFunctions = await this.getDevicesFunctions(deviceIds);
    let devices = [];
    for (let i = 0; i < res.result.devices.length; i++) {
      devices.push(Object.assign({}, res.result.devices[i], devicesFunctions.find((j) => j.devices[0] == res.result.devices[i].id)))
    }

    // for (let i = 0; i < devices.length; i++) {
    //   for (let j = 0; j < devices[i].status.length; j++) {
    //     devices[i].status.push(Object.assign({}, devices[i].status[j], devices[i].functions.find((k) => k.code == devices[i].status[j].code)))
    //   }
    // }

    return devices;
  }

  // 单个设备获取指令集
  async getDeviceFunctions(deviceID) {
    let res = await this.get(`/v1.0/devices/${deviceID}/functions`);
    return res.result;
  }

  // 批量获取设备支持的指令集
  async getDevicesFunctions(devIds = []) {
    let res = await this.get(`/v1.0/devices/functions`, { 'device_ids': devIds.join(',') });
    return res.result;
  }

  // 获取单个设备详情
  async getDeviceInfo(deviceID) {
    let res = await this.get(`/v1.0/devices/${deviceID}`);
    // console.log(`TuyaOpenAPI SH getDeviceInfo`);
    return res.result;
  }

  // 批量获取设备信息
  async getDeviceListInfo(devIds = []) {
    if (devIds.length == 0) {
      return [];
    }
    let res = await this.get(`/v1.0/devices`, { 'device_ids': devIds.join(',') });
    return res.result.list;
  }

  // 获取单个设备状态
  async getDeviceStatus(deviceID) {
    let res = await this.get(`/v1.0/devices/${deviceID}/status`);
    return res.result;
  }


  // 根据设备 ID 来移除设备
  async removeDevice(deviceID) {
    let res = await this.delete(`/v1.0/devices/${deviceID}`);
    return res.result;
  }

  // 下发设备指令
  async sendCommand(deviceID, params) {
    let res = await this.post(`/v1.0/devices/${deviceID}/commands`, params);
    return res.result;
  }

  async request(method, path, params = null, body = null) {
    await this._refreshAccessTokenIfNeed(path);

    let now = new Date().getTime();
    let access_token = this.tokenInfo.access_token || '';
    let headers = {
      't': `${now}`,
      'client_id': this.access_id,
      'sign': this._getSign(this.access_id, this.access_key, access_token, now),
      'sign_method': 'HMAC-SHA256',
      'access_token': access_token,
      'lang': this.lang,
      'dev_lang': 'javascript',
      'dev_channel': 'homebridge',
      'devVersion': '1.0.6',

    };
    this.log.log(`TuyaOpenAPI request: method = ${method}, endpoint = ${this.endpoint}, path = ${path}, params = ${JSON.stringify(params)}, body = ${JSON.stringify(body)}, headers = ${JSON.stringify(headers)}`);

    let res = await axios({
      baseURL: this.endpoint,
      url: path,
      method: method,
      headers: headers,
      params: params,
      data: body,
    });

    this.log.log(`TuyaOpenAPI response: ${JSON.stringify(res.data)} path = ${path}`);
    return res.data;
  }

  async get(path, params) {
    return this.request('get', path, params, null);
  }

  async post(path, params) {
    return this.request('post', path, null, params);
  }

  async delete(path, params) {
    return this.request('delete', path, params, null);
  }

  _getSign(access_id, access_key, access_token = '', timestamp = 0) {
    let message = access_id + access_token + `${timestamp}`;
    let hash = Crypto.HmacSHA256(message, access_key);
    let sign = hash.toString().toUpperCase();
    return sign;
  }

}

module.exports = TuyaSHOpenAPI;
