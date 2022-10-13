
export default class TuyaDevice {
  public devId?: string;
  // ...

  constructor(...obj: object[]) {
    Object.assign(this, ...obj);
  }
}
