
export interface TuyaDeviceFunction {
  code: string;
  name: string;
  desc: string;
  type: string;
  values: string;
}

export interface TuyaDeviceStatus {
  code: string;
  value: string | number | boolean;
}

export default interface TuyaDevice {

  // device
  id: string;
  uuid: string;
  name: string;
  online: boolean;

  // product
  product_id: string;
  product_name: string;
  icon: string;
  category: string;
  functions: TuyaDeviceFunction[];

  // status
  status: TuyaDeviceStatus[];

  // location
  ip: string;
  lat: string;
  lon: string;
  time_zone: string;

  // time
  create_time: number;
  active_time: number;
  update_time: number;

  // ...

}
