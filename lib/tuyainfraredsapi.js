class TuyaInfraredsAPI {

  constructor(tuyaOpenApi) {
    this.tuyaOpenApi = tuyaOpenApi;
  }

  // get IR device categories
  async getCategories(deviceID) {
    let res = await this.tuyaOpenApi.get(`/v2.0/infrareds/${deviceID}/categories`);
    return res.result;
  }

  // get remotes configured in IR device
  async getRemotes(infraredID) {
    let res = await this.tuyaOpenApi.get(`/v2.0/infrareds/${infraredID}/remotes`);
    return res.result;
  }

  // get AC status
  async getACStatus(infraredID, remoteID) {
    let res = await this.tuyaOpenApi.get(`/v2.0/infrareds/${infraredID}/remotes/${remoteID}/ac/status`);
    return res.result;
  }

  // set AC status
  async setACStatus(infraredID, remoteID, params) {
    let res = await this.tuyaOpenApi.post(`/v2.0/infrareds/${infraredID}/air-conditioners/${remoteID}/scenes/command`, params);
    return res.result;
  }

}

module.exports = TuyaInfraredsAPI; 