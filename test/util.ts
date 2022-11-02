import fs from 'fs';
import { PLATFORM_NAME } from '../src/settings';
import { TuyaPlatformConfig } from '../src/config';
import TuyaDevice, { TuyaDeviceSchema } from '../src/device/TuyaDevice';
import { TuyaOpenAPIResponse } from '../src/core/TuyaOpenAPI';

const file = fs.readFileSync(`${process.env.HOME}/.homebridge-dev/config.json`);
const { platforms } = JSON.parse(file.toString());

export const config: TuyaPlatformConfig = platforms.find(platform => platform.platform === PLATFORM_NAME);

export function expectDevice(device: TuyaDevice) {
  // console.debug(JSON.stringify(device));

  expect(device).not.toBeUndefined();

  expect(device.id.length).toBeGreaterThan(0);
  expect(device.uuid.length).toBeGreaterThan(0);
  expect(device.online).toBeDefined();

  expect(device.product_id.length).toBeGreaterThan(0);
  expect(device.category.length).toBeGreaterThan(0);
  for (const schema of device.schema) {
    expectDeviceSchema(schema);
  }

  expect(device.status).toBeDefined();
}

export function expectDeviceSchema(schema: TuyaDeviceSchema) {
  expect(schema.code.length).toBeGreaterThan(0);
  expect(schema.mode.length).toBeGreaterThan(0);
  expect(schema.type.length).toBeGreaterThan(0);
  expect(schema.property).toBeDefined();
}

export function expectSuccessResponse(res: TuyaOpenAPIResponse) {
  expect(res.success).toBeTruthy();
}
