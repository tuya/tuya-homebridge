import Crypto from 'crypto-js';
import TuyaOpenAPI from './TuyaOpenAPI';

export default class TuyaCustomOpenAPI extends TuyaOpenAPI {

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

}
