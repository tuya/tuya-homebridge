/* eslint-disable no-console */
import { describe, expect, test } from '@jest/globals';

import TuyaOpenAPI from '../src/core/TuyaOpenAPI';
import TuyaDevice from '../src/device/TuyaDevice';

import TuyaCustomDeviceManager from '../src/device/TuyaCustomDeviceManager';

import { config, expectDevice, expectSuccessResponse } from './util';

const { options } = config;
if (options.projectType === '1') {
  const api = new TuyaOpenAPI(options.endpoint, options.accessId, options.accessKey);
  const deviceManager = new TuyaCustomDeviceManager(api);

  describe('TuyaOpenAPI', () => {
    test('getToken()', async () => {
      const res = await api.getToken();
      expectSuccessResponse(res);
    });

    test('customGetUserInfo()', async () => {
      const res = await api.customGetUserInfo('homebridge');
      expectSuccessResponse(res);
    });

    test('customCreateUser()', async () => {
      const res = await api.customCreateUser('homebridge', 'homebridge');
      if (res.success === false && res.code === 14520015) {
        // already exist
      } else {
        expectSuccessResponse(res);
      }
    });

    test('customLogin()', async () => {
      const res = await api.customLogin('homebridge', 'homebridge');
      expectSuccessResponse(res);
      expect(api.isLogin()).toBeTruthy();
    });

    test('_refreshAccessTokenIfNeed()', async () => {
      api.tokenInfo.expire = 0;
      await api._refreshAccessTokenIfNeed('');
    });
  });

  describe('TuyaCustomDeviceManager', () => {

    const assetIDList: string[] = [];
    test('getAssetList()', async () => {
      const res = await deviceManager.getAssetList();
      expectSuccessResponse(res);
      const assets = res.result.list || res.result.assets;
      for (const { asset_id } of assets) {
        assetIDList.push(asset_id);
      }
    });

    test('updateDevices()', async () => {
      const devices = await deviceManager.updateDevices(assetIDList);
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
