/* eslint-disable no-console */
import { describe, expect, test } from '@jest/globals';

import TuyaOpenAPI from '../src/core/TuyaOpenAPI';
import TuyaDevice from '../src/device/TuyaDevice';

import TuyaHomeDeviceManager from '../src/device/TuyaHomeDeviceManager';

import { config, expectDevice, expectSuccessResponse } from './util';

const { options } = config;
if (options.projectType === '2') {
  const api = new TuyaOpenAPI(TuyaOpenAPI.Endpoints.CHINA, options.accessId, options.accessKey);
  const deviceManager = new TuyaHomeDeviceManager(api);

  describe('TuyaOpenAPI', () => {
    test('homeLogin()', async () => {
      await api.homeLogin(options.countryCode, options.username, options.password, options.appSchema);
      expect(api.isLogin()).toBeTruthy();
    });

    test('_refreshAccessTokenIfNeed()', async () => {
      api.tokenInfo.expire = 0;
      await api._refreshAccessTokenIfNeed('');
    });
  });

  describe('TuyaHomeDeviceManager', () => {

    const homeIDList: number[] = [];
    test('getHomeList()', async () => {
      const res = await deviceManager.getHomeList();
      expectSuccessResponse(res);
      for (const { home_id } of res.result) {
        homeIDList.push(home_id);
      }
    });

    test('updateDevices()', async () => {
      const devices = await deviceManager.updateDevices(homeIDList);
      expect(devices).not.toBeNull();
      for (const device of devices) {
        expectDevice(device);
      }
    }, 30 * 1000);

    test('updateDevice()', async () => {
      let device: TuyaDevice | null = Array.from(deviceManager.devices)[0];
      expectDevice(device);
      device = await deviceManager.updateDevice(device.id);
      expectDevice(device!);
    });

  });

  describe('TuyaOpenMQ', () => {

    test('start()', async () => {
      await new Promise((resolve, reject) => {
        deviceManager.mq._onConnect = () => {
          console.log('TuyaOpenMQ connected');
          resolve(null);
        };
        deviceManager.mq._onError = (err) => {
          console.log('TuyaOpenMQ error:', err);
          reject(err);
        };
        deviceManager.mq.start();
      });
    });

    test('stop()', async () => {
      deviceManager.mq.stop();
    });

  });
} else {
  test('', async () => {
    //
  });
}
