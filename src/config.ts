import assert from 'assert';
import validator from 'validator';

export interface TuyaPlatformConfigOptions {
  projectType: '1' | '2';
  endpoint?: string;
  accessId: string;
  accessKey: string;
  countryCode?: number;
  username: string;
  password: string;
  appSchema?: string;
}

export function validate(options: TuyaPlatformConfigOptions) {

  assert(options, 'config.optionss undefined');
  assert(['1', '2'].includes(options.projectType), 'config.options.projectType unsupported');

  const {
    projectType,
    endpoint,
    accessId,
    accessKey,
    countryCode,
    username,
    password,
    appSchema,
  } = options;

  if (projectType === '1') {
    assert(endpoint && validator.isURL(endpoint), 'config.options.endpoint is not a valid URL');
    assert(accessId && accessId.length > 0, 'config.options.accessId is empty');
    assert(accessKey && accessKey.length > 0, 'config.options.accessKey is empty');
    assert(username && username.length > 0, 'config.options.username is empty');
    assert(password && password.length > 0, 'config.options.password is empty');
  } else if (projectType === '2') {
    assert(accessId && accessId.length > 0, 'config.options.accessId is empty');
    assert(accessKey && accessKey.length > 0, 'config.options.accessKey is empty');
    assert(countryCode && countryCode > 0, 'config.options.countryCode is invalid');
    assert(username && username.length > 0, 'config.options.username is empty');
    assert(password && password.length > 0, 'config.options.password is empty');
    assert(appSchema && ['tuyaSmart', 'smartlife'].includes(appSchema), 'config.options.appSchema unsupported');
  }

}
