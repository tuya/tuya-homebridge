import mqtt from 'mqtt';
import { v4 as uuid_v4 } from 'uuid';
import Crypto from 'crypto';
import CryptoJS from 'crypto-js';

import TuyaOpenAPI from './TuyaOpenAPI';

const GCM_TAG_LENGTH = 16;

export default class TuyaOpenMQ {

  public running = false;
  public client?: mqtt.MqttClient;
  public messageListeners = new Set<CallableFunction>();
  public deviceTopic?: string;
  public linkId = uuid_v4();

  constructor(
    public api: TuyaOpenAPI,
    public type: string,
    public log,
  ) {

  }

  start() {
    this.running = true;
    this._loop_start();
  }

  stop() {
    this.running = false;
    if (this.client) {
      this.client.end();
    }
  }

  async _loop_start() {

    // eslint-disable-next-line
    const that = this;
    while (this.running) {

      const res = await this._getMQConfig('mqtt');
      if (res.success === false) {
        this.stop();
        break;
      }

      const mqConfig = res.result;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { url, client_id, username, password, expire_time, source_topic, sink_topic } = mqConfig;
      that.deviceTopic = source_topic.device;
      console.log(`TuyaOpenMQ connecting: ${url}`);
      const client = mqtt.connect(url, {
        clientId: client_id,
        username: username,
        password: password,
      });

      client.on('connect', this._onConnect);
      client.on('error', this._onError);
      client.on('end', this._onEnd);
      client.on('message', (topic, payload) => that._onMessage(client, mqConfig, topic, payload));
      client.subscribe(that.deviceTopic!);

      if (this.client) {
        this.client.end();
      }
      this.client = client;

      // reconnect every 2 hours required
      await new Promise(r => setTimeout(r, (expire_time - 60) * 1000));
    }

  }

  async _getMQConfig(linkType: string) {
    const res = await this.api.post('/v1.0/iot-03/open-hub/access-config', {
      'uid': this.api.tokenInfo.uid,
      'link_id': this.linkId,
      'link_type': linkType,
      'topics': 'device',
      'msg_encrypted_version': this.type,
    });
    return res;
  }

  _onConnect() {
    console.log('TuyaOpenMQ connected');
  }

  _onError(err) {
    console.log('TuyaOpenMQ error:', err);
  }

  _onEnd() {
    console.log('TuyaOpenMQ end');
  }

  _onMessage(client: mqtt.MqttClient, mqConfig, topic: string, payload: Buffer) {
    const message = JSON.parse(payload.toString());
    message.data = JSON.parse(this.type === '2.0' ?
      this._decodeMQMessage(message.data, mqConfig.password, message.t)
      : this._decodeMQMessage_1_0(message.data, mqConfig.password));
    console.log(`TuyaOpenMQ onMessage: topic = ${topic}, message = ${JSON.stringify(message)}`);
    this.messageListeners.forEach(listener => {
      if(this.deviceTopic === topic){
        listener(message.data);
      }
    });
  }

  // 1.0
  _decodeMQMessage_1_0(b64msg: string, password: string) {
    password = password.substring(8, 24);
    const msg = CryptoJS.AES.decrypt(b64msg, CryptoJS.enc.Utf8.parse(password), {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8);
    return msg;
  }

  _decodeMQMessage(data: string, password: string, t: number) {
    // Base64 decoding generates Buffers
    const tmpbuffer = Buffer.from(data, 'base64');
    const key = password.substring(8, 24).toString();
    //get iv_length & iv_buffer
    const iv_length = tmpbuffer.readUIntBE(0, 4);
    const iv_buffer = tmpbuffer.slice(4, iv_length + 4);
    //Removes the IV bits of the head and 16 bits of the tail tags
    const data_buffer = tmpbuffer.slice(iv_length + 4, tmpbuffer.length - GCM_TAG_LENGTH);
    const cipher = Crypto.createDecipheriv('aes-128-gcm', key, iv_buffer);
    //setAuthTag buffer
    cipher.setAuthTag(tmpbuffer.slice(tmpbuffer.length - GCM_TAG_LENGTH, tmpbuffer.length));
    //setAAD buffer
    const buf = Buffer.allocUnsafe(6);
    buf.writeUIntBE(t, 0, 6);
    cipher.setAAD(buf);

    const msg = cipher.update(data_buffer);
    return msg.toString('utf8');
  }

  addMessageListener(listener: CallableFunction) {
    this.messageListeners.add(listener);
  }

  removeMessageListener(listener: CallableFunction) {
    this.messageListeners.delete(listener);
  }

}
