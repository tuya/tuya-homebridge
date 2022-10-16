import { TuyaMQTTProtocol } from '../core/TuyaOpenMQ';
import TuyaDevice, { TuyaDeviceStatus } from './TuyaDevice';
import TuyaDeviceManager, { Events } from './TuyaDeviceManager';

export default class TuyaCustomDeviceManager extends TuyaDeviceManager {

  async updateDevices() {

    const devices: TuyaDevice[] = [];
    const assets = await this.getAssets();

    let deviceDataArr = [];
    const deviceIdArr = [];
    for (const asset of assets) {
      const res = await this.getDeviceIDList(asset.asset_id);
      deviceDataArr = deviceDataArr.concat(res);
    }

    for (const deviceData of deviceDataArr) {
      const { device_id } = deviceData;
      deviceIdArr.push(device_id);
    }

    const devicesInfoArr = await this.getDeviceListInfo(deviceIdArr);
    const devicesStatusArr = await this.getDeviceListStatus(deviceIdArr);

    for (let i = 0; i < devicesInfoArr.length; i++) {
      const deviceInfo = devicesInfoArr[i];
      const functions = await this.getDeviceFunctions(deviceInfo.id);
      const status = devicesStatusArr.find((j) => j.id === deviceInfo.id);
      const device = new TuyaDevice(deviceInfo);
      device.functions = functions;
      device.status = status;
      devices.push(device);
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
      this.devices.splice(this.devices.indexOf(oldDevice), 1);
    }

    const device = new TuyaDevice(deviceInfo);
    device.functions = functions;
    this.devices.push(device);

    return device;
  }

  async sendCommands(deviceID: string, commands: TuyaDeviceStatus[]) {
    const res = await this.api.post(`/v1.0/iot-03/devices/${deviceID}/commands`, { commands });
    return res.result;
  }



  // Gets a list of human-actionable assets
  async getAssets() {
    const res = await this.api.get('/v1.0/iot-03/users/assets', {
      'parent_asset_id': null,
      'page_no': 0,
      'page_size': 100,
    });
    return res.result.assets;
  }

  // Query the list of device IDs under the asset
  async getDeviceIDList(assetID: string) {
    const res = await this.api.get(`/v1.0/iot-02/assets/${assetID}/devices`);
    return res.result.list;
  }

  // Gets the device instruction set
  async getDeviceFunctions(deviceID: string) {
    const res = await this.api.get(`/v1.0/iot-03/devices/${deviceID}/functions`);
    return res.result;
  }

  // Get individual device information
  async getDeviceInfo(deviceID: string) {
    const res = await this.api.get(`/v1.0/iot-03/devices/${deviceID}`);
    return res.result;
  }

  // Batch access to device information
  async getDeviceListInfo(devIds: string[] = []) {
    if (devIds.length === 0) {
      return [];
    }
    const res = await this.api.get('/v1.0/iot-03/devices', { 'device_ids': devIds.join(',') });
    return res.result.list;
  }

  // Gets the individual device state
  async getDeviceStatus(deviceID: string) {
    const res = await this.api.get(`/v1.0/iot-03/devices/${deviceID}/status`);
    return res.result;
  }

  // Batch access to device status
  async getDeviceListStatus(devIds: string[] = []) {
    if (devIds.length === 0) {
      return [];
    }
    const res = await this.api.get('/v1.0/iot-03/devices/status', { 'device_ids': devIds.join(',') });
    return res.result;
  }


  async onMQTTMessage(topic: string, protocol: TuyaMQTTProtocol, message) {
    // TODO test
  }

}
