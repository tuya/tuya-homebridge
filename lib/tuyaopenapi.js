const axios = require('axios').default;
const Crypto = require('crypto-js');

class TuyaOpenAPI {

  constructor(endpoint, accessId, accessKey, lang = 'en') {
    this.endpoint = endpoint;
    this.access_id = accessId;
    this.access_key = accessKey;
    this.lang = lang;
    
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
    if (this.isLogin() == false) {
      return;
    }

    if (path.startsWith('/v1.0/token')) {
      return;
    }

    if (this.tokenInfo.expire - 60 * 1000 > new Date().getTime()) {
      return;
    }

    this.tokenInfo.access_token = '';
    let res = await this.get(`/v1.0/token/${this.tokenInfo.refreshToken}`);
    let {access_token, refresh_token, uid, expire} = res.result;
    this.tokenInfo = {
      access_token: access_token,
      refresh_token: refresh_token,
      uid: uid,
      expire: expire + new Date().getTime(),
    };

    return;
  }

  async login(username, password) {
    let res = await this.post('/v1.0/iot-03/users/login', {
      'username': username,
      'password': Crypto.SHA256(password).toString().toLowerCase(),
    });
    let {access_token, refresh_token, uid, expire} = res.result;

    this.tokenInfo = {
      access_token: access_token,
      refresh_token: refresh_token,
      uid: uid,
      expire: expire + new Date().getTime(),
    };

    return res.result;
  }

  isLogin() {
    return this.tokenInfo && this.tokenInfo.access_token.count > 0;
  }

  //获取所有设备
  async getDeviceList() {
    let assets = await this.get_assets();

    var deviceDataArr = [];
    var deviceIdArr = [];
    for (const asset of assets) {
      let res = await this.getDeviceIDList(asset.asset_id);
      deviceDataArr = deviceDataArr.concat(res);
    }

    for (const deviceData of deviceDataArr) {
      deviceIdArr.push(deviceData.device_id);
    };

    let devicesInfoArr = await this.getDeviceListInfo(deviceIdArr);
    let devicesStatusArr = await this.getDeviceListStatus(deviceIdArr);

    let devices = [];
    for (let i = 0; i < devicesInfoArr.length; i++) {
      devices.push(Object.assign({}, devicesInfoArr[i], devicesStatusArr.find((j) => j.id == devicesInfoArr[i].id)))
    }

    return devices;
  }

  // 获取人员可操作资产列表
  async get_assets() {
    let res = await this.get('/v1.0/iot-03/users/assets', {
      'parent_asset_id': null,
      'page_no': 0,
      'page_size': 100,
    });
    return res.result.assets;
  }

  // 查询资产下的设备ID列表
  async getDeviceIDList(assetID) {
    let res = await this.get(`/v1.0/iot-02/assets/${assetID}/devices`);
    return res.result.list;
  }

  // 获取设备指令集
  async getDeviceFunctions(deviceID) {
    let res = await this.get(`/v1.0/iot-03/devices/${deviceID}/functions`);
    return res.result;
  }


  // 获取单个设备信息
  async getDeviceInfo(deviceID) {
    let res = await this.get(`/v1.0/iot-03/devices/${deviceID}`);
    return res.result;
  }

  // 批量获取设备信息
  async getDeviceListInfo(devIds = []) {
    if (devIds.length == 0) {
      return [];
    }
    let res = await this.get(`/v1.0/iot-03/devices`, { 'device_ids': devIds.join(',') });
    return res.result.list;
  }

  // 获取单个设备状态
  async getDeviceStatus(deviceID) {
    let res = await this.get(`/v1.0/iot-03/devices/${deviceID}/status`);
    return res.result;
  }

  // 批量获取设备状态
  async getDeviceListStatus(devIds = []) {
    if (devIds.length == 0) {
      return [];
    }
    let res = await this.get(`/v1.0/iot-03/devices/status`, { 'device_ids': devIds.join(',') });
    return res.result;
  }

  async sendCommand(deviceID, params) {
    let res = await this.post(`/v1.0/iot-03/devices/${deviceID}/commands`, params);
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
      'dev_version': '1.0.7',
      
    };
    console.log(`TuyaOpenAPI request: method = ${method}, endpoint = ${this.endpoint}, path = ${path}, params = ${JSON.stringify(params)}, body = ${JSON.stringify(body)}, headers = ${JSON.stringify(headers)}`);

    let res = await axios({
      baseURL: this.endpoint,
      url: path,
      method: method,
      headers: headers,
      params: params,
      data: body,
    });

    console.log(`TuyaOpenAPI response: ${JSON.stringify(res.data)}`);
    return res.data;
  }

  async get(path, params) {
    return this.request('get', path, params, null);
  }

  async post(path, params) {
    return this.request('post', path, null, params);
  }
  
  _getSign(access_id, access_key, access_token = '', timestamp = 0) {
    let message = access_id + access_token + `${timestamp}`;
    let hash = Crypto.HmacSHA256(message, access_key);
    let sign = hash.toString().toUpperCase();
    return sign;
  }

}

module.exports = TuyaOpenAPI;
