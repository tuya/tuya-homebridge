import EventEmitter from 'events';
import TuyaOpenAPI from '../core/TuyaOpenAPI';
import TuyaOpenMQ from '../core/TuyaOpenMQ';
import TuyaDevice, { TuyaDeviceStatus } from './TuyaDevice';

enum Events {
  DEVICE_ADD = 'DEVICE_ADD',
  DEVICE_INFO_UPDATE = 'DEVICE_INFO_UPDATE',
  DEVICE_STATUS_UPDATE = 'DEVICE_STATUS_UPDATE',
  DEVICE_DELETE = 'DEVICE_DELETE',
}

enum TuyaMQTTProtocol {
  DEVICE_STATUS_UPDATE = 4,
  DEVICE_INFO_UPDATE = 20,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateDevices(areaIDList: []): Promise<TuyaDevice[]> {
    return [];
  }

  async updateDevice(deviceID: string) {

    let res = await this.getDeviceInfo(deviceID);
    if (!res.success) {
      return null;
    }
    const device = new TuyaDevice(res.result);

    res = await this.getDeviceFunctions(deviceID);
    if (res.success) {
      device.functions = res.result['functions'];
    } else {
      this.log.warn(`Get device functions failed. code=${res.code}, msg=${res.msg}`);
      device.functions = [];
    }

    const oldDevice = this.getDevice(deviceID);
    if (oldDevice) {
      this.devices.splice(this.devices.indexOf(oldDevice), 1);
    }

    this.devices.push(device);

    return device;
  }

  async getDeviceInfo(deviceID: string) {
    const res = await this.api.get(`/v1.0/devices/${deviceID}`);
    return res;
  }

  async getDeviceListInfo(devIds: string[] = []) {
    const res = await this.api.get('/v1.0/devices', { 'device_ids': devIds.join(',') });
    return res;
  }

  async getDeviceFunctions(deviceID: string) {
    const res = await this.api.get(`/v1.0/devices/${deviceID}/functions`);
    return res;
  }

  async getDeviceListFunctions(devIds: string[] = []) {
    const PAGE_COUNT = 20;

    let index = 0;
    const results: object[] = [];
    while(index < devIds.length) {
      const res = await this.api.get('/v1.0/devices/functions', { 'device_ids': devIds.slice(index, index += PAGE_COUNT).join(',') });
      if (res.result) {
        results.push(...res.result);
      }
    }

    return results;
  }

  async sendCommands(deviceID: string, commands: TuyaDeviceStatus[]) {
    const res = await this.api.post(`/v1.0/devices/${deviceID}/commands`, { commands });
    return res.result;
  }


  async onMQTTMessage(topic: string, protocol: TuyaMQTTProtocol, message) {
    switch(protocol) {
      case TuyaMQTTProtocol.DEVICE_STATUS_UPDATE: {
        const { devId, status } = message;
        const device = this.getDevice(devId);
        if (!device) {
          return;
        }

        for (const item of device.status) {
          const _item = status.find(_item => _item.code === item.code);
          if (!_item) {
            continue;
          }
          item.value = _item.value;
        }

        this.emit(Events.DEVICE_STATUS_UPDATE, device, status);
        break;
      }
      case TuyaMQTTProtocol.DEVICE_INFO_UPDATE: {
        const { bizCode, bizData, devId } = message;
        if (bizCode === 'bindUser') {
          // Disabled because it will received device which not belongs to current user's home.
          // // TODO failed if request to quickly
          // await new Promise(resolve => setTimeout(resolve, 3000));
          // const device = await this.updateDevice(devId);
          // this.emit(Events.DEVICE_ADD, device);
        } else if (bizCode === 'nameUpdate') {
          const { name } = bizData;
          const device = this.getDevice(devId);
          if (!device) {
            return;
          }
          device.name = name;
          this.emit(Events.DEVICE_INFO_UPDATE, device, bizData);
        } else if (bizCode === 'delete') {
          this.emit(Events.DEVICE_DELETE, devId);
        } else {
          this.log.warn(`Unhandled mqtt message: bizCode=${bizCode}, bizData=${JSON.stringify(bizData)}`);
        }
        break;
      }
      default:
        this.log.warn(`Unhandled mqtt message: protocol=${protocol}, message=${JSON.stringify(message)}`);
        break;
    }
  }

}
