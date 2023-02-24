const axios = require('axios').default;
const Crypto = require('crypto-js');
const uuid = require('uuid');
const nonce = uuid.v1();
const CountryUtil = require('../util/countryutil')
class TuyaSHOpenAPI {

  constructor(accessId, accessKey, username, password, countryCode, appSchema, log, lang = 'en') {
    this.countryCode = countryCode;
    this.endpoint = (this.countryCode)? new CountryUtil().getEndPointWithCountryCode(this.countryCode) : "https://openapi.tuyaus.com"
    this.access_id = accessId;
    this.access_key = accessKey;
    this.lang = lang;
    this.username = username;
    this.password = password;
    
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
      'country_code': this.countryCode,
      'username': this.username,
      'password': md5pwd,
      'schema': this.appSchema
    });
    let { access_token, refresh_token, uid, expire_time , platform_url} = res.result;
    this.endpoint = platform_url ? platform_url : this.endpoint;
    this.tokenInfo = {
      access_token: access_token,
      refresh_token: refresh_token,
      uid: uid,
      expire: expire_time * 1000 + new Date().getTime(),
    };

    return;
  }

  //Gets the list of devices under the associated user
  async getDevices() {
    let res = await this.get(`/v1.0/iot-01/associated-users/devices`, { 'size': 100 });

    let tempIds = [];
    for (let i = 0; i < res.result.devices.length; i++) {
      tempIds.push(res.result.devices[i].id)
    }
    let deviceIds = this._refactoringIdsGroup(tempIds, 20);
    let devicesFunctions = [];
    for (let ids of deviceIds) {
      let functions = await this.getDevicesFunctions(ids);
      devicesFunctions.push.apply(devicesFunctions,functions);
    }
    let devices = [];
    if (devicesFunctions) {
      for (let i = 0; i < res.result.devices.length; i++) {
        devices.push(Object.assign({}, res.result.devices[i], devicesFunctions.find((j) => j.devices[0] == res.result.devices[i].id)))
      }
    } else {
      devices = res.result.devices;
    }

    return devices;
  }

  _refactoringIdsGroup(array, subGroupLength) {
    let index = 0;
    let newArray = [];
    while(index < array.length) {
        newArray.push(array.slice(index, index += subGroupLength));
    }
    return newArray;
}

  // single device gets the instruction set
  async getDeviceFunctions(deviceID) {
    let res = await this.get(`/v1.0/devices/${deviceID}/functions`);
    return res.result;
  }

  // Batch access to device instruction sets
  async getDevicesFunctions(devIds = []) {
    let res = await this.get(`/v1.0/devices/functions`, { 'device_ids': devIds.join(',') });
    return res.result;
  }

  // Get individual device details
  async getDeviceInfo(deviceID) {
    let res = await this.get(`/v1.0/devices/${deviceID}`);
    return res.result;
  }

  // Batch access to device details
  async getDeviceListInfo(devIds = []) {
    if (devIds.length == 0) {
      return [];
    }
    let res = await this.get(`/v1.0/devices`, { 'device_ids': devIds.join(',') });
    return res.result.list;
  }

  // Gets the individual device state
  async getDeviceStatus(deviceID) {
    let res = await this.get(`/v1.0/devices/${deviceID}/status`);
    return res.result;
  }

  // Remove the device based on the device ID
  async removeDevice(deviceID) {
    let res = await this.delete(`/v1.0/devices/${deviceID}`);
    return res.result;
  }

  // sendCommand
  async sendCommand(deviceID, params) {
    let res = await this.post(`/v1.0/devices/${deviceID}/commands`, params);
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

  async request(method, path, params = null, body = null) {

    try {
      await this._refreshAccessTokenIfNeed(path);
    } catch (e) {
      this.log.log(e);
      this.log.log(`Attention⚠️ ⚠️ ⚠️ ! You get an error!`)
      // this.log.log('Please confirm that the Access ID and Access Secret of the Smart Home PaaS project you are using were created after May 25, 2021.')
      // this.log.log('Please linked devices by using Tuya Smart or Smart Life app in your cloud project.')
      return;
    }

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

  async delete(path, params) {
    return this.request('delete', path, params, null);
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

module.exports = TuyaSHOpenAPI;
