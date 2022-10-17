import { PlatformConfig } from 'homebridge';
import { Validator } from 'jsonschema';

// eslint-disable-next-line
// @ts-ignore
import { schema } from '../config.schema.json';

export interface TuyaPlatformCustomConfigOptions {
  projectType: '1';
  endpoint: string;
  accessId: string;
  accessKey: string;
  username: string;
  password: string;
}

export interface TuyaPlatformPaaSConfigOptions {
  projectType: '2';
  accessId: string;
  accessKey: string;
  countryCode: number;
  username: string;
  password: string;
  appSchema: string;
}

export type TuyaPlatformConfigOptions = TuyaPlatformCustomConfigOptions | TuyaPlatformPaaSConfigOptions;

export interface TuyaPlatformConfig extends PlatformConfig {
  options: TuyaPlatformConfigOptions;
}

export function validate(config: TuyaPlatformConfig) {
  const result = new Validator().validate(config, schema);
  if (result.errors) {
    for (const error of result.errors) {
      throw new Error(error.message);
    }
  }
}
