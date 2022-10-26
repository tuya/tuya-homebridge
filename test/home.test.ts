/* eslint-disable no-console */
import { describe, expect, test } from '@jest/globals';

import TuyaOpenAPI from '../src/core/TuyaOpenAPI';
import TuyaOpenMQ from '../src/core/TuyaOpenMQ';
import TuyaDevice from '../src/device/TuyaDevice';

import TuyaHomeDeviceManager from '../src/device/TuyaHomeDeviceManager';

import { config, expectDevice, expectSuccessResponse } from './util';

const { options } = config;
if (options.projectType === '2') {
  const api = new TuyaOpenAPI(TuyaOpenAPI.Endpoints.CHINA, options.accessId, options.accessKey);
  const mq = new TuyaOpenMQ(api, '1.0');
  const homeDeviceManager = new TuyaHomeDeviceManager(api, mq);

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
      const res = await homeDeviceManager.getHomeList();
      expectSuccessResponse(res);
      for (const { home_id } of res.result) {
        homeIDList.push(home_id);
      }
    });

    test('updateDevices()', async () => {
      const devices = await homeDeviceManager.updateDevices(homeIDList);
      expect(devices).not.toBeNull();
      for (const device of devices) {
        expectDevice(device);
      }
    }, 10 * 1000);

    test('updateDevice()', async () => {
      let device: TuyaDevice | null = Array.from(homeDeviceManager.devices)[0];
      expectDevice(device);
      device = await homeDeviceManager.updateDevice(device.id);
      expectDevice(device!);
    });

  });

  describe('TuyaOpenMQ', () => {

    test('start()', async () => {
      await new Promise((resolve, reject) => {
        mq._onConnect = () => {
          console.log('TuyaOpenMQ connected');
          resolve(null);
        };
        mq._onError = (err) => {
          console.log('TuyaOpenMQ error:', err);
          reject(err);
        };
        mq.start();
      });
    });

    test('stop()', async () => {
      mq.stop();
    });

  });
} else {
  test('', async () => {
    //
  });
}
