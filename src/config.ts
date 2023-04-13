import { PlatformConfig } from 'homebridge';
import { TuyaDeviceSchemaProperty, TuyaDeviceSchemaType } from './device/TuyaDevice';

export interface TuyaPlatformDeviceSchemaConfig {
  code: string;
  newCode?: string;
  type?: TuyaDeviceSchemaType;
  property?: TuyaDeviceSchemaProperty;
  onGet?: string;
  onSet?: string;
  hidden?: boolean;
}

export interface TuyaPlatformDeviceConfig {
  id: string;
  category?: string;
  schema?: Array<TuyaPlatformDeviceSchemaConfig>;
}

export interface TuyaPlatformCustomConfigOptions {
  projectType: '1';
  endpoint: string;
  accessId: string;
  accessKey: string;
  username: string;
  password: string;
  deviceOverrides?: Array<TuyaPlatformDeviceConfig>;
}

export interface TuyaPlatformHomeConfigOptions {
  projectType: '2';
  endpoint?: string;
  accessId: string;
  accessKey: string;
  countryCode: number;
  username: string;
  password: string;
  appSchema: string;
  homeWhitelist?: Array<number>;
  deviceOverrides?: Array<TuyaPlatformDeviceConfig>;
}

export type TuyaPlatformConfigOptions = TuyaPlatformCustomConfigOptions | TuyaPlatformHomeConfigOptions;

export interface TuyaPlatformConfig extends PlatformConfig {
  options: TuyaPlatformConfigOptions;
}

export const customOptionsSchema = {
  properties: {
    endpoint: { type: 'string', format: 'url', required: true },
    accessId: { type: 'string', required: true },
    accessKey: { type: 'string', required: true },
    deviceOverrides: { 'type': 'array' },
  },
};

export const homeOptionsSchema = {
  properties: {
    accessId: { type: 'string', required: true },
    accessKey: { type: 'string', required: true },
    endpoint: { type: 'string', format: 'url' },
    countryCode: { 'type': 'integer', 'minimum': 1, required: true },
    username: { type: 'string', required: true },
    password: { type: 'string', required: true },
    appSchema: { 'type': 'string', required: true },
    homeWhitelist: { 'type': 'array' },
    deviceOverrides: { 'type': 'array' },
  },
};
