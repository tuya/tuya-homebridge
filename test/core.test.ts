import {describe, expect, test} from '@jest/globals';
import TuyaHomeOpenAPI from '../src/core/TuyaHomeOpenAPI';
import TuyaOpenMQ from '../src/core/TuyaOpenMQ';

const homeAPI = new TuyaHomeOpenAPI(
  TuyaHomeOpenAPI.Endpoints.CHINA,
  'xxxxxxxxxxxxxxx',
  'xxxxxxxxxxxxxxx',
  '86',
  'xxxxxxxxxxx',
  'xxxxxxxxxxx',
  'smartlife',
  null,
);

const homeMQ = new TuyaOpenMQ(homeAPI, '1.0', null);

describe('TuyaCustomOpenAPI', () => {
  test('getDevices() not null', async () => {
    const devices = await homeAPI.getDevices();
    expect(devices).not.toBeNull();
  });
});

describe('TuyaOpenMQ', () => {
  test('Connection', async () => {
    return new Promise((resolve, reject) => {
      homeMQ._onConnect = () => {
        console.log('TuyaOpenMQ connected');
        resolve(null);
        homeMQ.stop();
      };
      homeMQ._onError = (err) => {
        console.log('TuyaOpenMQ error:', err);
        reject(err);
      };
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      homeMQ._onEnd = () => {

      };
      homeMQ.start();
    });
  });
});
