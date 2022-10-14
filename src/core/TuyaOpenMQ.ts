import mqtt from 'mqtt';
import { v4 as uuid_v4 } from 'uuid';
import Crypto from 'crypto';
import CryptoJS from 'crypto-js';

import TuyaOpenAPI from './TuyaOpenAPI';
import Logger from '../util/Logger';

const GCM_TAG_LENGTH = 16;

interface TuyaMQTTConfigSourceTopic {
  device: string;
}

interface TuyaMQTTConfig {
  url: string;
  client_id: string;
  username: string;
  password: string;
  expire_time: number;
  source_topic: TuyaMQTTConfigSourceTopic;
  sink_topic: object;
}

export default class TuyaOpenMQ {

  public running = false;
  public client?: mqtt.MqttClient;
  public config?: TuyaMQTTConfig;
  public messageListeners = new Set<CallableFunction>();
  public linkId = uuid_v4();

  public timer?: NodeJS.Timer;

  constructor(
    public api: TuyaOpenAPI,
    public type: string,
    public log: Logger = console,
  ) {

  }

  start() {
    this.running = true;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    if (this.client) {
      this.client.removeAllListeners();
      this.client.end();
    }
  }

  async _loop() {

    const res = await this._getMQConfig('mqtt');
    if (res.success === false) {
      this.stop();
      return;
    }

    if (this.client) {
      this.client.removeAllListeners();
      this.client.end();
    }

    const { url, client_id, username, password, expire_time, source_topic } = res.result;
    this.log.debug(`TuyaOpenMQ connecting: ${url}`);
    const client = mqtt.connect(url, {
      clientId: client_id,
      username: username,
      password: password,
    });

    client.on('connect', this._onConnect.bind(this));
    client.on('error', this._onError.bind(this));
    client.on('end', this._onEnd.bind(this));
    client.on('message', this._onMessage.bind(this));
    client.subscribe(source_topic.device);

    this.client = client;
    this.config = res.result;

    // reconnect every 2 hours required
    this.timer = setTimeout(this._loop.bind(this), (expire_time - 60) * 1000);

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
    this.log.debug('TuyaOpenMQ connected');
  }

  _onError(error: Error) {
    this.log.error('TuyaOpenMQ error:', error);
  }

  _onEnd() {
    this.log.debug('TuyaOpenMQ end');
  }

  _onMessage(topic: string, payload: Buffer) {
    const message = JSON.parse(payload.toString());
    message.data = this._decodeMQMessage(message.data, this.config!.password, message.t);
    this.log.debug(`TuyaOpenMQ onMessage: topic = ${topic}, message = ${JSON.stringify(message)}`);
    this.messageListeners.forEach(listener => {
      if (this.config!.source_topic.device === topic) {
        listener(message.data);
      }
    });
  }

  _decodeMQMessage_1_0(b64msg: string, password: string) {
    password = password.substring(8, 24);
    const msg = CryptoJS.AES.decrypt(b64msg, CryptoJS.enc.Utf8.parse(password), {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8);
    return msg;
  }

  _decodeMQMessage_2_0(data: string, password: string, t: number) {
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

  _decodeMQMessage(data: string, password: string, t: number) {
    if (this.type === '2.0') {
      return this._decodeMQMessage_2_0(data, password, t);
    } else {
      this._decodeMQMessage_1_0(data, password);
    }
  }

  addMessageListener(listener: CallableFunction) {
    this.messageListeners.add(listener);
  }

  removeMessageListener(listener: CallableFunction) {
    this.messageListeners.delete(listener);
  }

}
