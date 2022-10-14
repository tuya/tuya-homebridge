import TuyaDevice from './TuyaDevice';
import TuyaDeviceManager, { Events } from './TuyaDeviceManager';

export default class TuyaHomeDeviceManager extends TuyaDeviceManager {

  async updateDevices() {

    const devices = new Set<TuyaDevice>();
    const res = await this.api.get('/v1.0/iot-01/associated-users/devices', { 'size': 100 });

    const tempIds: string[] = [];
    for (let i = 0; i < res.result.devices.length; i++) {
      tempIds.push(res.result.devices[i].id);
    }
    const deviceIds = this._refactoringIdsGroup(tempIds, 20);
    const devicesFunctions: object[] = [];
    for (const ids of deviceIds) {
      const functions = await this.getDevicesFunctions(ids);
      devicesFunctions.push(functions);
    }

    for (let i = 0; i < res.result.devices.length; i++) {
      const deviceInfo = res.result.devices[i];
      const functions = devicesFunctions.find((item) => {
        const devices = item['devices'];
        if (!devices || devices.length === 0) {
          return false;
        }
        return devices[0] === deviceInfo.id;
      }) || {};
      const device: TuyaDevice = Object.assign({}, deviceInfo, functions);
      devices.add(device);
    }

    this.devices = devices;
    return devices;
  }

  async updateDevice(deviceID: string) {

    const deviceInfo = await this.getDeviceInfo(deviceID);
    const functions = await this.getDeviceFunctions(deviceID);
    // TODO status?

    const oldDevice = this.getDevice(deviceID);
    if (oldDevice) {
      this.devices.delete(oldDevice);
    }

    const device: TuyaDevice = Object.assign({}, deviceInfo, functions);
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


  _refactoringIdsGroup(array: string[], subGroupLength: number) {
    let index = 0;
    const newArray: string[][] = [];
    while(index < array.length) {
      newArray.push(array.slice(index, index += subGroupLength));
    }
    return newArray;
  }

  // single device gets the instruction set
  async getDeviceFunctions(deviceID: string) {
    const res = await this.api.get(`/v1.0/devices/${deviceID}/functions`);
    return res.result;
  }

  // Batch access to device instruction sets
  async getDevicesFunctions(devIds: string[] = []) {
    const res = await this.api.get('/v1.0/devices/functions', { 'device_ids': devIds.join(',') });
    return res.result;
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
