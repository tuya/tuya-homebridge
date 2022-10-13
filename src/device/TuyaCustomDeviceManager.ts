import TuyaCustomOpenAPI from '../core/TuyaCustomOpenAPI';
import TuyaOpenMQ from '../core/TuyaOpenMQ';
import TuyaDevice from './TuyaDevice';
import TuyaDeviceManager, { Events } from './TuyaDeviceManager';

export default class TuyaCustomDeviceManager extends TuyaDeviceManager {

  constructor(
    public api: TuyaCustomOpenAPI,
    public mq: TuyaOpenMQ,
  ) {
    super(api, mq);
  }

  async updateDevices() {

    const devices = new Set<TuyaDevice>();
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
      devices.add(new TuyaDevice(deviceInfo, functions, status));
    }

    this.devices = devices;
    return devices;
  }

  async updateDevice(deviceID: string) {

    const deviceInfo = await this.getDeviceInfo(deviceID);
    const functions = await this.getDeviceFunctions(deviceID);

    let device = Array.from(this.devices).find(device => device.devId === deviceID);
    if (device) {
      this.devices.delete(device);
    }

    device = new TuyaDevice(deviceInfo, functions);
    this.devices.add(device);

    return device;
  }

  async sendCommand(deviceID: string, params) {
    const res = await this.api.post(`/v1.0/iot-03/devices/${deviceID}/commands`, params);
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


  async onMQTTMessage(message) {
    // TODO test
    const { bizCode, bizData } = message;
    if (bizCode) {
      if (bizCode === Events.DEVICE_DELETE) {
        this.devices.delete(message.devId);
        this.emit(Events.DEVICE_DELETE, message.devId);
      } else if (bizCode === 'bindUser') {
        this.updateDevice(bizData.devId);
        this.emit(Events.DEVICE_BIND, message.devId);
      }
    } else {
      this.emit(Events.DEVICE_UPDATE, message.devId);
    }
  }

}
