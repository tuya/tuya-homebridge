import {describe, expect, test} from '@jest/globals';
import TuyaCustomOpenAPI from '../src/core/TuyaCustomOpenAPI';
import TuyaOpenMQ from '../src/core/TuyaOpenMQ';

const customAPI = new TuyaCustomOpenAPI(
  TuyaCustomOpenAPI.Endpoints.CHINA,
  'xxxxxxxxxxxxxxx',
  'xxxxxxxxxxxxxxx',
  '86',
  'xxxxxxxxxxx',
  'xxxxxxxxxxx',
  'smartlife',
  null,
);

const customMQ = new TuyaOpenMQ(customAPI, '1.0', null);

describe('TuyaCustomOpenAPI', () => {
  test('getDevices() not null', async () => {
    const devices = await customAPI.getDevices();
    expect(devices).not.toBeNull();
  });
});

describe('TuyaOpenMQ', () => {
  test('Connection', async () => {
    return new Promise((resolve, reject) => {
      customMQ._onConnect = () => {
        console.log('TuyaOpenMQ connected');
        resolve(null);
        customMQ.stop();
      };
      customMQ._onError = (err) => {
        console.log('TuyaOpenMQ error:', err);
        reject(err);
      };
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      customMQ._onEnd = () => {

      };
      customMQ.start();
    });
  });
});
