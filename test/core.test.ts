/* eslint-disable no-console */
import fs from 'fs';
import { describe, expect, test } from '@jest/globals';
import { PLATFORM_NAME } from '../src/settings';
import TuyaHomeOpenAPI from '../src/core/TuyaHomeOpenAPI';
import TuyaOpenMQ from '../src/core/TuyaOpenMQ';
import TuyaDevice from '../src/device/TuyaDevice';
import TuyaHomeDeviceManager from '../src/device/TuyaHomeDeviceManager';

const file = fs.readFileSync(`${process.env.HOME}/.homebridge-dev/config.json`);
const { platforms } = JSON.parse(file.toString());
const config = platforms.find(platform => platform.platform === PLATFORM_NAME);
const { options } = config;

const homeAPI = new TuyaHomeOpenAPI(TuyaHomeOpenAPI.Endpoints.CHINA, options.accessId, options.accessKey);
const homeMQ = new TuyaOpenMQ(homeAPI, '1.0');
const homeDeviceManager = new TuyaHomeDeviceManager(homeAPI, homeMQ);


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


describe('TuyaHomeOpenAPI', () => {
  test('login()', async () => {
    await homeAPI.login(options.countryCode, options.username, options.password, options.appSchema);
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
