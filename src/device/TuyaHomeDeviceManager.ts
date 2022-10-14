import TuyaDevice, { TuyaDeviceFunction } from './TuyaDevice';
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

  async sendCommand(deviceID: string, params) {
    const res = await this.api.post(`/v1.0/devices/${deviceID}/commands`, params);
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


  async onMQTTMessage(message) {
    const { bizCode, bizData } = message;
    if (bizCode) {
      if (bizCode === Events.DEVICE_DELETE) {
        this.devices.delete(message.devId);
        this.emit(Events.DEVICE_DELETE, message.devId);
      } else if (bizCode === 'bindUser') {
        const device = this.updateDevice(bizData.devId);
        this.emit(Events.DEVICE_BIND, device);
      }
    } else {
      const device = this.getDevice(message.devId);
      if (device && device.id === message.devId) {
        this.emit(Events.DEVICE_UPDATE, message.devId);
      }
    }
  }

}
