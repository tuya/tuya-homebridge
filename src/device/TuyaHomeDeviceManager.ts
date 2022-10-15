import { TuyaMQTTProtocol } from '../core/TuyaOpenMQ';
import TuyaDevice, { TuyaDeviceFunction, TuyaDeviceStatus } from './TuyaDevice';
import TuyaDeviceManager, { Events } from './TuyaDeviceManager';

export default class TuyaHomeDeviceManager extends TuyaDeviceManager {

  async updateDevices() {

    const res = await this.api.get('/v1.0/iot-01/associated-users/devices', { 'size': 100 });
    const devices = new Set<TuyaDevice>(res.result.devices);

    const devIds: string[] = [];
    for (const device of devices) {
      devIds.push(device.id);
    }

    const functions = await this.getDeviceListFunctions(devIds);

    for (const device of devices) {
      for (const item of functions) {
        if (device.product_id === item['product_id']) {
          device.functions = item['functions'] as TuyaDeviceFunction[];
          break;
        }
      }
      device.functions = device.functions || [];
    }

    this.devices = devices;
    return devices;
  }

  async updateDevice(deviceID: string) {

    const device: TuyaDevice = await this.getDeviceInfo(deviceID);
    if (!device) {
      throw new Error('getDeviceInfo failed');
    }

    const functions = await this.getDeviceFunctions(deviceID);
    if (functions) {
      device.functions = functions['functions'];
    } else {
      device.functions = [];
    }

    const oldDevice = this.getDevice(deviceID);
    if (oldDevice) {
      this.devices.delete(oldDevice);
    }

    this.devices.add(device);

    return device;
  }

  async removeDevice(deviceID: string) {
    const res = await this.api.delete(`/v1.0/devices/${deviceID}`);
    const device = this.getDevice(deviceID);
    if (device) {
      this.devices.delete(device);
    }
    return res.result;
  }

  async sendCommands(deviceID: string, commands: TuyaDeviceStatus[]) {
    const res = await this.api.post(`/v1.0/devices/${deviceID}/commands`, { commands });
    return res.result;
  }


  // single device gets the instruction set
  async getDeviceFunctions(deviceID: string) {
    const res = await this.api.get(`/v1.0/devices/${deviceID}/functions`);
    return res.result;
  }

  // Batch access to device instruction sets
  async getDeviceListFunctions(devIds: string[] = []) {
    const PAGE_COUNT = 20;

    let index = 0;
    const results: object[] = [];
    while(index < devIds.length) {
      const res = await this.api.get('/v1.0/devices/functions', { 'device_ids': devIds.slice(index, index += PAGE_COUNT).join(',') });
      results.push(...res.result);
    }

    return results;
  }

  // Get individual device details
  async getDeviceInfo(deviceID: string) {
    const res = await this.api.get(`/v1.0/devices/${deviceID}`);
    return res.result;
  }

  // Batch access to device details
  async getDeviceListInfo(devIds: string[] = []) {
    if (devIds.length === 0) {
      return [];
    }
    const res = await this.api.get('/v1.0/devices', { 'device_ids': devIds.join(',') });
    return res.result.list;
  }

  // Gets the individual device state
  async getDeviceStatus(deviceID: string) {
    const res = await this.api.get(`/v1.0/devices/${deviceID}/status`);
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
          // TODO failed if request to quickly
          await new Promise(resolve => setTimeout(resolve, 3000));
          const device = await this.updateDevice(devId);
          this.emit(Events.DEVICE_ADD, device);
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
