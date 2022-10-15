import EventEmitter from 'events';
import TuyaOpenAPI from '../core/TuyaOpenAPI';
import TuyaOpenMQ, { TuyaMQTTProtocol } from '../core/TuyaOpenMQ';
import TuyaDevice from './TuyaDevice';

export enum Events {
  DEVICE_ADD = 'DEVICE_ADD',
  DEVICE_INFO_UPDATE = 'DEVICE_INFO_UPDATE',
  DEVICE_STATUS_UPDATE = 'DEVICE_STATUS_UPDATE',
  DEVICE_DELETE = 'DEVICE_DELETE',
}

export default class TuyaDeviceManager extends EventEmitter {

  static readonly Events = Events;

  public devices = new Set<TuyaDevice>();
  public log = this.api.log;

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

  async onMQTTMessage(topic: string, protocol: TuyaMQTTProtocol, message) {
    //
  }

}
