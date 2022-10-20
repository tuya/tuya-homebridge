/* eslint-disable no-console */
import fs from 'fs';
import { describe, expect, test } from '@jest/globals';
import { PLATFORM_NAME } from '../src/settings';
import { TuyaPlatformConfig } from '../src/config';

import TuyaOpenAPI, { Endpoints } from '../src/core/TuyaOpenAPI';
import TuyaOpenMQ from '../src/core/TuyaOpenMQ';
import TuyaDevice from '../src/device/TuyaDevice';

import TuyaHomeDeviceManager from '../src/device/TuyaHomeDeviceManager';
import TuyaCustomDeviceManager from '../src/device/TuyaCustomDeviceManager';


const file = fs.readFileSync(`${process.env.HOME}/.homebridge-dev/config.json`);
const { platforms } = JSON.parse(file.toString());
const config: TuyaPlatformConfig = platforms.find(platform => platform.platform === PLATFORM_NAME);
const { options } = config;


function expectDevice(device: TuyaDevice) {
  // console.debug(JSON.stringify(device));

  expect(device).not.toBeUndefined();

  expect(device.id.length).toBeGreaterThan(0);
  expect(device.uuid.length).toBeGreaterThan(0);
  expect(device.online).toBeDefined();

  expect(device.product_id.length).toBeGreaterThan(0);
  expect(device.category.length).toBeGreaterThan(0);
  expect(device.functions).toBeDefined();

  expect(device.status).toBeDefined();
}

let api: TuyaOpenAPI;
let mq: TuyaOpenMQ;
if (options.projectType === '1') {
  api = new TuyaOpenAPI(options.endpoint as Endpoints, options.accessId, options.accessKey);
  mq = new TuyaOpenMQ(api, '2.0');
  const customDeviceManager = new TuyaCustomDeviceManager(api, mq);

  describe('TuyaOpenAPI', () => {
    test('customLogin()', async () => {
      await api.customLogin(options.username, options.password);
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
  });

} else if (options.projectType === '2') {
  api = new TuyaOpenAPI(TuyaOpenAPI.Endpoints.CHINA, options.accessId, options.accessKey);
  mq = new TuyaOpenMQ(api, '1.0');
  const homeDeviceManager = new TuyaHomeDeviceManager(api, mq);

  describe('TuyaOpenAPI', () => {
    test('homeLogin()', async () => {
      await api.homeLogin(options.countryCode, options.username, options.password, options.appSchema);
    });

    test('_refreshAccessTokenIfNeed()', async () => {
      api.tokenInfo.expire = 0;
      await api._refreshAccessTokenIfNeed('');
    });
  });

  describe('TuyaHomeDeviceManager', () => {

    test('updateDevices()', async () => {
      const devices = await homeDeviceManager.updateDevices();
      expect(devices).not.toBeNull();
      for (const device of devices) {
        expectDevice(device);
      }
    }, 10 * 1000);

    test('updateDevice()', async () => {
      let device = Array.from(homeDeviceManager.devices)[0];
      expectDevice(device);
      device = await homeDeviceManager.updateDevice(device.id);
      expectDevice(device);
    });

  });
} else {
  mq = null!;
}

if (mq) {
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
}
