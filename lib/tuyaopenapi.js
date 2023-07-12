const axios = require('axios').default;
const Crypto = require('crypto-js');
const uuid = require('uuid');
const nonce = uuid.v1();

class TuyaOpenAPI {

  constructor(endpoint, accessId, accessKey, log, lang = 'en') {
    this.endpoint = endpoint;
    this.access_id = accessId;
    this.access_key = accessKey;
    this.lang = lang;
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
      expire: expire *1000 + new Date().getTime(),
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

  //Get all devices
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
      let functions = await this.getDeviceFunctions(devicesInfoArr[i].id)
      devices.push(Object.assign({}, devicesInfoArr[i], functions,devicesStatusArr.find((j) => j.id == devicesInfoArr[i].id)))
    }
    return devices;
  }

  // Gets a list of human-actionable assets
  async get_assets() {
    let res = await this.get('/v1.0/iot-03/users/assets', {
      'parent_asset_id': null,
      'page_no': 0,
      'page_size': 100,
    });
    return res.result.assets;
  }

  // Query the list of device IDs under the asset
  async getDeviceIDList(assetID) {
    let res = await this.get(`/v1.0/iot-02/assets/${assetID}/devices`);
    return res.result.list;
  }

  // Gets the device instruction set
  async getDeviceFunctions(deviceID) {
    let res = await this.get(`/v1.0/iot-03/devices/${deviceID}/functions`);
    return res.result;
  }

  // Get individual device information
  async getDeviceInfo(deviceID) {
    let res = await this.get(`/v1.0/iot-03/devices/${deviceID}`);
    return res.result;
  }
  
  // Gets the individual device state
  async getCameraRSTP(deviceID) {
    const cameraparams = {
      "type": "rtsp"
  }
    let res = await this.post(`/v1.0/users/${this.tokenInfo.uid}/devices/${deviceID}/stream/actions/allocate`, cameraparams);
    return res.result;
  }

  // Batch access to device information
  async getDeviceListInfo(devIds = []) {
    if (devIds.length == 0) {
      return [];
    }
    let res = await this.get(`/v1.0/iot-03/devices`, { 'device_ids': devIds.join(',') });
    return res.result.list;
  }

  // Gets the individual device state
  async getDeviceStatus(deviceID) {
    let res = await this.get(`/v1.0/iot-03/devices/${deviceID}/status`);
    return res.result;
  }

  // Gets the individual device state
  async getCameraRSTP(deviceID) {
    const cameraparams = {
      "type": "rtsp"
  }
    let res = await this.post(`/v1.0/users/${this.tokenInfo.uid}/devices/${deviceID}/stream/actions/allocate`, cameraparams);
    return res.result;
  }

  // Batch access to device status
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
    let stringToSign = this._getStringToSign(method, path, params, body)
    let headers = {
      't': `${now}`,
      'client_id': this.access_id,
      'nonce': nonce,
      'Signature-Headers': 'client_id',
      'sign': this._getSign(this.access_id, this.access_key, access_token, now, stringToSign),
      'sign_method': 'HMAC-SHA256',
      'access_token': access_token,
      'lang': this.lang,
      'dev_lang': 'javascript',
      'dev_channel': 'homebridge',
      'devVersion': '1.5.0',
      
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
  
  _getSign(access_id, access_key, access_token = '', timestamp = 0, stringToSign) {
    let message = access_id + access_token + `${timestamp}` + nonce + stringToSign;
    let hash = Crypto.HmacSHA256(message, access_key);
    let sign = hash.toString().toUpperCase();
    return sign;
  }

  _getStringToSign(method, path, params, body) {
    let httpMethod = method.toUpperCase();
    let bodyStream
    if (body) {
      bodyStream = JSON.stringify(body)
    }else{
      bodyStream = ''
    }
    
    let contentSHA256 = Crypto.SHA256(bodyStream)
    let headers = 'client_id' + ':' + this.access_id + "\n"
    let url = this._getSignUrl(path, params)
    let result = httpMethod + "\n" + contentSHA256 + "\n" + headers + "\n" + url;
    return result
  }

  _getSignUrl(path, obj) {
    if (!obj) {
      return path
    } else {
      var i, url = '';
      for (i in obj) url += '&' + i + '=' + obj[i];
      return path + "?" + url.substr(1)
    }
  }

}

module.exports = TuyaOpenAPI;
