/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import EventEmitter from 'events';
import TuyaOpenAPI from '../core/TuyaOpenAPI';
import TuyaOpenMQ, { TuyaMQTTProtocol } from '../core/TuyaOpenMQ';
import TuyaDevice, { TuyaDeviceStatus } from './TuyaDevice';

export enum Events {
  DEVICE_ADD = 'DEVICE_ADD',
  DEVICE_INFO_UPDATE = 'DEVICE_INFO_UPDATE',
  DEVICE_STATUS_UPDATE = 'DEVICE_STATUS_UPDATE',
  DEVICE_DELETE = 'DEVICE_DELETE',
}

export default class TuyaDeviceManager extends EventEmitter {

  static readonly Events = Events;

  public devices: TuyaDevice[] = [];
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

  async updateDevices(): Promise<TuyaDevice[]> {
    return [];
  }

  async updateDevice(deviceID: string): Promise<TuyaDevice | null> {
    return null;
  }

  async removeDevice(deviceID: string) {

  }

  async sendCommands(deviceID: string, commands: TuyaDeviceStatus[]) {

  }

  async onMQTTMessage(topic: string, protocol: TuyaMQTTProtocol, message) {

  }

}
