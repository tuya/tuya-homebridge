import Crypto from 'crypto-js';
import TuyaOpenAPI from './TuyaOpenAPI';

export default class TuyaCustomOpenAPI extends TuyaOpenAPI {

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
