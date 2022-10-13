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

}
