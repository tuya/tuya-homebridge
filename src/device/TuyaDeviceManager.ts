import EventEmitter from 'events';
import TuyaOpenAPI from '../core/TuyaOpenAPI';
import TuyaOpenMQ from '../core/TuyaOpenMQ';
import TuyaDevice from './TuyaDevice';

export enum Events {
  DEVICE_DELETE = 'delete',
  DEVICE_BIND = 'bindUser',
  DEVICE_UPDATE = 'update',
}

export default class TuyaDeviceManager extends EventEmitter {

  static readonly Events = Events;

  public devices = new Set<TuyaDevice>();

  constructor(
    public api: TuyaOpenAPI,
    public mq: TuyaOpenMQ,
  ) {
    super();
    mq.addMessageListener(this.onMQTTMessage.bind(this));
  }

  getDevice(deviceID: string) {
    return Array.from(this.devices).find(device => device.id === deviceID);
  }

  async updateDevices() {
    return new Set<TuyaDevice>();
  }

  async updateDevice(deviceID: string) {
    return <TuyaDevice>{};
  }

  async removeDevice(deviceID: string) {
    //
  }

  async sendCommand(deviceID: string, params) {
    //
  }

  async onMQTTMessage(message) {
    //
  }

}
