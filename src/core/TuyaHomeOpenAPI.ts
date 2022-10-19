/* eslint-disable max-len */
import Crypto from 'crypto-js';
import TuyaOpenAPI, { Endpoints } from './TuyaOpenAPI';

export const DEFAULT_ENDPOINTS = {
  [Endpoints.AMERICA.toString()]: [1, 51, 52, 54, 55, 56, 57, 58, 60, 62, 63, 64, 66, 81, 82, 84, 95, 239, 245, 246, 500, 502, 591, 593, 594, 595, 597, 598, 670, 672, 674, 675, 677, 678, 682, 683, 686, 690, 852, 853, 886, 970, 1721, 1787, 1809, 1829, 1849, 4779, 5999, 35818],
  [Endpoints.CHINA.toString()]: [86],
  [Endpoints.EUROPE.toString()]: [7, 20, 27, 30, 31, 32, 33, 34, 36, 39, 40, 41, 43, 44, 45, 46, 47, 48, 49, 61, 65, 90, 92, 93, 94, 212, 213, 216, 218, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 240, 241, 242, 243, 244, 248, 250, 251, 252, 253, 254, 255, 256, 257, 258, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 291, 297, 298, 299, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 385, 386, 387, 389, 420, 421, 423, 501, 503, 504, 505, 506, 507, 508, 509, 590, 592, 596, 673, 676, 679, 680, 681, 685, 687, 688, 689, 691, 692, 855, 856, 880, 960, 961, 962, 964, 965, 966, 967, 968, 971, 972, 973, 974, 975, 976, 977, 992, 993, 994, 995, 996, 998, 1242, 1246, 1264, 1268, 1284, 1340, 1345, 1441, 1473, 1649, 1664, 1670, 1671, 1684, 1758, 1767, 1784, 1868, 1869, 1876],
  [Endpoints.INDIA.toString()]: [91],
};

export default class TuyaHomeOpenAPI extends TuyaOpenAPI {

  public countryCode?: number;
  public username?: string;
  public password?: string;
  public appSchema?: string;

  async login(countryCode: number, username: string, password: string, appSchema: string) {

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

    this.countryCode = countryCode;
    this.username = username;
    this.password = password;
    this.appSchema = appSchema;

    return res.result;
  }

}
