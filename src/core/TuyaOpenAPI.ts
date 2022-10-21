/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios, { Method } from 'axios';
import Crypto from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line
// @ts-ignore
import { version, bugs } from '../../package.json';

import Logger from '../util/Logger';

export enum Endpoints {
  AMERICA = 'https://openapi.tuyaus.com',
  AMERICA_EAST = 'https://openapi-ueaz.tuyaus.com',
  CHINA = 'https://openapi.tuyacn.com',
  EUROPE = 'https://openapi.tuyaeu.com',
  EUROPE_WEST = 'https://openapi-weaz.tuyaeu.com',
  INDIA = 'https://openapi.tuyain.com',
}

export const DEFAULT_ENDPOINTS = {
  [Endpoints.AMERICA.toString()]: [1, 51, 52, 54, 55, 56, 57, 58, 60, 62, 63, 64, 66, 81, 82, 84, 95, 239, 245, 246, 500, 502, 591, 593, 594, 595, 597, 598, 670, 672, 674, 675, 677, 678, 682, 683, 686, 690, 852, 853, 886, 970, 1721, 1787, 1809, 1829, 1849, 4779, 5999, 35818],
  [Endpoints.CHINA.toString()]: [86],
  [Endpoints.EUROPE.toString()]: [7, 20, 27, 30, 31, 32, 33, 34, 36, 39, 40, 41, 43, 44, 45, 46, 47, 48, 49, 61, 65, 90, 92, 93, 94, 212, 213, 216, 218, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 240, 241, 242, 243, 244, 248, 250, 251, 252, 253, 254, 255, 256, 257, 258, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 291, 297, 298, 299, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 385, 386, 387, 389, 420, 421, 423, 501, 503, 504, 505, 506, 507, 508, 509, 590, 592, 596, 673, 676, 679, 680, 681, 685, 687, 688, 689, 691, 692, 855, 856, 880, 960, 961, 962, 964, 965, 966, 967, 968, 971, 972, 973, 974, 975, 976, 977, 992, 993, 994, 995, 996, 998, 1242, 1246, 1264, 1268, 1284, 1340, 1345, 1441, 1473, 1649, 1664, 1670, 1671, 1684, 1758, 1767, 1784, 1868, 1869, 1876],
  [Endpoints.INDIA.toString()]: [91],
};

const API_ERROR_MESSAGES = {
  1004: `Sign invalid. Please submit issue with logs at ${bugs.url}`,
  1106: `Permission denied. Please submit issue with logs at ${bugs.url}`,
  28841002: 'API subscription expired. Please renew the API subscription at Tuya IoT Platform.',
  28841105: `
API not authorized. Please go to "Tuya IoT Platform -> Cloud -> Development -> Project -> Service API",
and Authorize the following APIs before using:
- Authorization Token Management
- Device Status Notification
- IoT Core
- Industry Project Client Service (for "Custom" project type)
`,
};

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


  async homeLogin(countryCode: number, username: string, password: string, appSchema: string) {

    for (const _endpoint of Object.keys(DEFAULT_ENDPOINTS)) {
      const countryCodeList = DEFAULT_ENDPOINTS[_endpoint];
      if (countryCodeList.includes(countryCode)) {
        this.endpoint = <Endpoints>_endpoint;
      }
    }

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

  async customLogin(username: string, password: string) {
    const res = await this.post('/v1.0/iot-03/users/login', {
      'username': username,
      'password': Crypto.SHA256(password).toString().toLowerCase(),
    });
    const { access_token, refresh_token, uid, expire } = res.result;

    this.tokenInfo = {
      access_token: access_token,
      refresh_token: refresh_token,
      uid: uid,
      expire: expire * 1000 + new Date().getTime(),
    };

    return res.result;
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
    if (res.data && API_ERROR_MESSAGES[res.data.code]) {
      this.log.error(API_ERROR_MESSAGES[res.data.code]);
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
