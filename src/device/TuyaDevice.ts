
export enum TuyaDeviceFunctionType {
  Boolean = 'Boolean',
  Integer = 'Integer',
  Enum = 'Enum',
  String = 'String',
  Json = 'Json',
  Raw = 'Raw',
}

export type TuyaDeviceFunctionIntegerProperty = {
  min: number;
  max: number;
  scale: number;
  step: number;
  unit: string;
};

export type TuyaDeviceFunctionEnumProperty = {
  range: string[];
};

export type TuyaDeviceFunctionJSONProperty = object;

export type TuyaDeviceFunctionProperty = TuyaDeviceFunctionIntegerProperty
  | TuyaDeviceFunctionEnumProperty
  | TuyaDeviceFunctionJSONProperty;

export type TuyaDeviceFunction = {
  code: string;
  name: string;
  desc: string;
  type: TuyaDeviceFunctionType;
  values: string;
};

export type TuyaDeviceStatus = {
  code: string;
  value: string | number | boolean;
};

export default class TuyaDevice {

  // device
  id!: string;
  uuid!: string;
  name!: string;
  online!: boolean;

  // product
  product_id!: string;
  product_name!: string;
  icon!: string;
  category!: string;
  functions!: TuyaDeviceFunction[];

  // status
  status!: TuyaDeviceStatus[];

  // location
  ip!: string;
  lat!: string;
  lon!: string;
  time_zone!: string;

  // time
  create_time!: number;
  active_time!: number;
  update_time!: number;

  // ...

  constructor(obj: Partial<TuyaDevice>) {
    Object.assign(this, obj);
  }

  getDeviceFunction(code: string) {
    return this.functions.find(_function => _function.code === code);
  }

  getDeviceFunctionProperty(code: string) {
    const deviceFunction = this.getDeviceFunction(code);
    if (!deviceFunction) {
      return;
    }
    return JSON.parse(deviceFunction.values) as TuyaDeviceFunctionProperty;
  }

  getDeviceStatus(code: string) {
    return this.status.find(status => status.code === code);
  }

}
