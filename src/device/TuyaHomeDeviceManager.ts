import TuyaDevice from './TuyaDevice';
import TuyaDeviceManager from './TuyaDeviceManager';

export default class TuyaHomeDeviceManager extends TuyaDeviceManager {

  async getHomeList() {
    const res = await this.api.get(`/v1.0/users/${this.api.tokenInfo.uid}/homes`);
    return res;
  }

  async getHomeDeviceList(homeID: number) {
    const res = await this.api.get(`/v1.0/homes/${homeID}/devices`);
    return res;
  }

  async updateDevices(homeIDList: number[]) {

    let devices: TuyaDevice[] = [];
    for (const homeID of homeIDList) {
      const res = await this.getHomeDeviceList(homeID);
      devices = devices.concat((res.result as []).map(obj => new TuyaDevice(obj)));
    }
    if (devices.length === 0) {
      return [];
    }

    for (const device of devices) {
      device.schema = await this.getDeviceSchema(device.id);
    }

    // this.log.debug('Devices updated.\n', JSON.stringify(devices, null, 2));
    this.devices = devices;
    return devices;
  }

  async getSceneList(homeID: number) {
    const res = await this.api.get(`/v1.1/homes/${homeID}/scenes`);
    if (res.success === false) {
      this.log.warn('Get scene list failed. homeId = %d, code = %s, msg = %s', homeID, res.code, res.msg);
      return [];
    }

    const scenes: TuyaDevice[] = [];
    for (const { scene_id, name, enabled, status } of res.result) {
      if (enabled !== true || status !== '1') {
        continue;
      }

      scenes.push(new TuyaDevice({
        id: scene_id,
        uuid: scene_id,
        name,
        owner_id: homeID.toString(),
        product_id: 'scene',
        category: 'scene',
        schema: [],
        status: [],
        online: true,
      }));
    }
    return scenes;
  }

  async executeScene(homeID: string | number, sceneID: string) {
    const res = await this.api.post(`/v1.0/homes/${homeID}/scenes/${sceneID}/trigger`);
    return res;
  }
}
