
export enum TuyaDeviceSchemaMode {
  UNKNOWN = '',
  READ_WRITE = 'rw',
  READ_ONLY = 'ro',
  WRITE_ONLY = 'wo',
}

export enum TuyaDeviceSchemaType {
  Boolean = 'Boolean',
  Integer = 'Integer',
  Enum = 'Enum',
  String = 'String',
  Json = 'Json',
  Raw = 'Raw',
}

export type TuyaDeviceSchemaIntegerProperty = {
  min: number;
  max: number;
  scale: number;
  step: number;
  unit: string;
};

export type TuyaDeviceSchemaEnumProperty = {
  range: string[];
};

export type TuyaDeviceSchemaStringProperty = string;

export type TuyaDeviceSchemaJSONProperty = object;

export type TuyaDeviceSchemaProperty = TuyaDeviceSchemaIntegerProperty
  | TuyaDeviceSchemaEnumProperty
  | TuyaDeviceSchemaStringProperty
  | TuyaDeviceSchemaJSONProperty;

export type TuyaDeviceSchema = {
  code: string;
  // name: string;
  mode: TuyaDeviceSchemaMode;
  type: TuyaDeviceSchemaType;
  values: string;
  property: TuyaDeviceSchemaProperty; // JSON.parse(schema.values);
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
  schema!: TuyaDeviceSchema[];

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

  getSchema(code: string) {
    return this.schema.find(schema => schema.code === code);
  }

  getStatus(code: string) {
    return this.status.find(status => status.code === code);
  }

}
