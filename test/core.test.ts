/* eslint-disable no-console */
import { describe, expect, test } from '@jest/globals';
import TuyaHomeOpenAPI from '../src/core/TuyaHomeOpenAPI';
import TuyaOpenMQ from '../src/core/TuyaOpenMQ';
import TuyaHomeDeviceManager from '../src/device/TuyaHomeDeviceManager';
import { HomeConfig } from './env';

const homeAPI = new TuyaHomeOpenAPI(TuyaHomeOpenAPI.Endpoints.CHINA, HomeConfig.accessId, HomeConfig.accessKey);
const homeMQ = new TuyaOpenMQ(homeAPI, '1.0');
const homeDeviceManager = new TuyaHomeDeviceManager(homeAPI, homeMQ);

describe('TuyaHomeOpenAPI', () => {
  test('login()', async () => {
    await homeAPI.login(HomeConfig.countryCode, HomeConfig.username, HomeConfig.password, HomeConfig.appSchema);
  });
});

describe('TuyaHomeDeviceManager', () => {
  test('updateDevices() not null', async () => {
    const devices = await homeDeviceManager.updateDevices();
    expect(devices).not.toBeNull();
  });
});

describe('TuyaOpenMQ', () => {
  test('start()', async () => {
    await new Promise((resolve, reject) => {
      homeMQ._onConnect = () => {
        console.log('TuyaOpenMQ connected');
        resolve(null);
      };
      homeMQ._onError = (err) => {
        console.log('TuyaOpenMQ error:', err);
        reject(err);
      };
      homeMQ.start();
    });
  });

  test('stop()', async () => {
    homeMQ.stop();
  });

});
