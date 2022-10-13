
export default class TuyaDevice {
  public devId = '';
  public name = '';
  // ...

  constructor(...obj: object[]) {
    Object.assign(this, ...obj);
  }
}
