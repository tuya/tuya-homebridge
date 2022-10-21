/* eslint-disable no-console */
import { describe, expect, test } from '@jest/globals';

import TuyaOpenAPI from '../src/core/TuyaOpenAPI';
import TuyaOpenMQ from '../src/core/TuyaOpenMQ';
import TuyaDevice from '../src/device/TuyaDevice';

import TuyaCustomDeviceManager from '../src/device/TuyaCustomDeviceManager';

import { config, expectDevice } from './util';

const { options } = config;
if (options.projectType === '1') {
  const api = new TuyaOpenAPI(options.endpoint, options.accessId, options.accessKey);
  const mq = new TuyaOpenMQ(api, '2.0');
  const customDeviceManager = new TuyaCustomDeviceManager(api, mq);

  describe('TuyaOpenAPI', () => {
    test('customLogin()', async () => {
      await api.customLogin(options.username, options.password);
      expect(api.isLogin()).toBeTruthy();
    });

    test('_refreshAccessTokenIfNeed()', async () => {
      api.tokenInfo.expire = 0;
      await api._refreshAccessTokenIfNeed('');
    });
  });

  describe('TuyaCustomDeviceManager', () => {
    test('updateDevices()', async () => {
      const devices = await customDeviceManager.updateDevices();
      expect(devices).not.toBeNull();
      for (const device of devices) {
        expectDevice(device);
      }
    }, 10 * 1000);

    test('updateDevice()', async () => {
      let device: TuyaDevice | null = Array.from(customDeviceManager.devices)[0];
      expectDevice(device);
      device = await customDeviceManager.updateDevice(device.id);
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
