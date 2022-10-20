/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios, { Method } from 'axios';
import Crypto from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line
// @ts-ignore
import { version } from '../../package.json';

import Logger from '../util/Logger';

export enum Endpoints {
  AMERICA = 'https://openapi.tuyaus.com',
  AMERICA_EAST = 'https://openapi-ueaz.tuyaus.com',
  CHINA = 'https://openapi.tuyacn.com',
  EUROPE = 'https://openapi.tuyaeu.com',
  EUROPE_WEST = 'https://openapi-weaz.tuyaeu.com',
  INDIA = 'https://openapi.tuyain.com',
}

const API_SIGN_INVALID_ERROR_CODE = 1004;
const API_SIGN_INVALID_ERROR = 'Sign invalid. Please submit issue with logs at https://github.com/tuya/tuya-homebridge .';
const API_NOT_AUTHORIZED_ERROR_CODES = [1106, 28841105];
const API_NOT_AUTHORIZED_ERROR = `
API not authorized. Please go to "Tuya IoT Platform -> Cloud -> Development -> Project -> Service API",
and Authorize the following APIs before using:
- Authorization Token Management
- Device Status Notification
- IoT Core
- Industry Project Client Service (for Custom Project)
`;

type TuyaOpenAPIResponseSuccess = {
  success: true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
  t: number;
  tid: string;
};

type TuyaOpenAPIResponseError = {
  success: false;
  result: unknown;
  code: number;
  msg: string;
  t: number;
  tid: string;
};

export type TuyaOpenAPIResponse = TuyaOpenAPIResponseSuccess | TuyaOpenAPIResponseError;

export default class TuyaOpenAPI {

  static readonly Endpoints = Endpoints;

  public assetIDArr: Array<string> = [];
  public deviceArr: Array<object> = [];

  public tokenInfo = {
    access_token: '',
    refresh_token: '',
    uid: '',
    expire: 0,
  };

  constructor(
    public endpoint: Endpoints,
    public accessId: string,
    public accessKey: string,
    public log: Logger = console,
    public lang = 'en',
  ) {

  }

  isLogin() {
    return this.tokenInfo && this.tokenInfo.access_token && this.tokenInfo.access_token.length > 0;
  }

  isTokenExpired() {
    return (this.tokenInfo.expire - 60 * 1000 <= new Date().getTime());
  }

  async _refreshAccessTokenIfNeed(path: string) {
    if (!this.isLogin()) {
      return;
    }

    if (!this.isTokenExpired()) {
      return;
    }

    if (path.startsWith('/v1.0/token')) {
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

  async request(method: Method, path: string, params?, body?) {
    await this._refreshAccessTokenIfNeed(path);

    const now = new Date().getTime();
    const nonce = uuidv4();
    const accessToken = this.tokenInfo.access_token || '';
    const stringToSign = this._getStringToSign(method, path, params, body);
    const headers = {
      't': `${now}`,
      'client_id': this.accessId,
      'nonce': nonce,
      'Signature-Headers': 'client_id',
      'sign': this._getSign(this.accessId, this.accessKey, accessToken, now, nonce, stringToSign),
      'sign_method': 'HMAC-SHA256',
      'access_token': accessToken,
      'lang': this.lang,
      'dev_lang': 'javascript',
      'dev_channel': 'homebridge',
      'devVersion': version,
    };
    // eslint-disable-next-line max-len
    this.log.debug(`TuyaOpenAPI request: method = ${method}, endpoint = ${this.endpoint}, path = ${path}, params = ${JSON.stringify(params)}, body = ${JSON.stringify(body)}, headers = ${JSON.stringify(headers)}`);

    const res = await axios({
      baseURL: this.endpoint,
      url: path,
      method: method,
      headers: headers,
      params: params,
      data: body,
    });

    this.log.debug(`TuyaOpenAPI response: path = ${path}, data = ${JSON.stringify(res.data)}`);
    if (res.data.code === API_SIGN_INVALID_ERROR_CODE) {
      this.log.error(API_SIGN_INVALID_ERROR);
    } else if (API_NOT_AUTHORIZED_ERROR_CODES.includes(res.data.code)) {
      this.log.error(API_NOT_AUTHORIZED_ERROR);
    }

    return res.data as TuyaOpenAPIResponse;
  }

  async get(path: string, params?) {
    return this.request('get', path, params, null);
  }

  async post(path: string, params?) {
    return this.request('post', path, null, params);
  }

  async delete(path: string, params?) {
    return this.request('delete', path, params, null);
  }

  _getSign(accessId: string, accessKey: string, accessToken = '', timestamp = 0, nonce: string, stringToSign: string) {
    const message = [accessId, accessToken, timestamp, nonce, stringToSign].join('');
    const hash = Crypto.HmacSHA256(message, accessKey);
    const sign = hash.toString().toUpperCase();
    return sign;
  }

  _getStringToSign(method: Method, path: string, params, body) {
    const httpMethod = method.toUpperCase();
    const bodyStream = body ? JSON.stringify(body) : '';
    const contentSHA256 = Crypto.SHA256(bodyStream);
    const headers = `client_id:${this.accessId}\n`;
    const url = this._getSignUrl(path, params);
    const result = [httpMethod, contentSHA256, headers, url].join('\n');
    return result;
  }

  _getSignUrl(path: string, params) {
    if (!params) {
      return path;
    }

    const sortedKeys = Object.keys(params).sort();
    const kv: string[] = [];
    for (const key of sortedKeys) {
      if (params[key] !== null && params[key] !== undefined) {
        kv.push(`${key}=${params[key]}`);
      }
    }
    const url = `${path}?${kv.join('&')}`;

    return url;
  }

}
