const mqtt = require('mqtt');
const uuid = require('uuid');
const Crypto = require('crypto');
const CryptoJS = require('crypto-js');
const LINK_ID = uuid.v1();
GCM_TAG_LENGTH = 16;
var debuglog;
class TuyaOpenMQ {

    constructor(api, type, log) {
        this.type = type;
        this.api = api;
        this.message_listeners = new Set();
        this.client = null;
        debuglog = log;
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

        let that = this;
        while (this.running) {

            let res = await this._getMQConfig('mqtt');
            if (res.success == false) {
                this.stop();
                break;
            }

            let mqConfig = res.result;
            let {url, client_id, username, password, expire_time, source_topic, sink_topic } = mqConfig;
            that.deviceTopic = source_topic.device;
            debuglog.log(`TuyaOpenMQ connecting: ${url}`);
            let client = mqtt.connect(url, {
                clientId: client_id,
                username: username,
                password: password,
            });

            client.on('connect', this._onConnect);
            client.on('error', this._onError);
            client.on('end', this._onEnd);
            client.on('message', (topic, payload, packet) => that._onMessage(client, mqConfig, topic, payload));
            client.subscribe(that.deviceTopic);

            if (this.client) {
                this.client.end();
            }
            this.client = client;

            // reconnect every 2 hours required
            await new Promise(r => setTimeout(r, (expire_time - 60) * 1000));
        }

    }

    async _getMQConfig(linkType) {
        let res = await this.api.post('/v1.0/iot-03/open-hub/access-config', {
            'uid': this.api.tokenInfo.uid,
            'link_id': LINK_ID,
            'link_type': linkType,
            'topics': 'device',
            'msg_encrypted_version': this.type,
        });
        return res;
    }

    _onConnect() {
        debuglog.log("TuyaOpenMQ connected");
    }

    _onError(err) {
        debuglog.log("TuyaOpenMQ error:", err);
    }

    _onEnd() {
        debuglog.log("TuyaOpenMQ end");
    }

    _onMessage(client, mqConfig, topic, payload) {
        let message = JSON.parse(payload.toString());
        message.data = JSON.parse(this.type == '2.0' ?
            this._decodeMQMessage(message.data, mqConfig.password, message.t)
            : this._decodeMQMessage_1_0(message.data, mqConfig.password));
        debuglog.log(`TuyaOpenMQ onMessage: topic = ${topic}, message = ${JSON.stringify(message)}`);
        this.message_listeners.forEach(listener => {
            if(this.deviceTopic == topic){
                listener(message.data);
            }
        });
    }

    // 1.0
    _decodeMQMessage_1_0(b64msg, password) {
        password = password.substring(8, 24);
        let msg = CryptoJS.AES.decrypt(b64msg, CryptoJS.enc.Utf8.parse(password), {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7,
        }).toString(CryptoJS.enc.Utf8);
        return msg;
    }

    _decodeMQMessage(data, password, t) {
        // Base64 decoding generates Buffers
        var tmpbuffer = Buffer.from(data, 'base64');
        var key = password.substring(8, 24).toString('utf8');
        //get iv_length & iv_buffer
        var iv_length = tmpbuffer.readUIntBE(0,4);
        var iv_buffer = tmpbuffer.slice(4, iv_length + 4);
        //Removes the IV bits of the head and 16 bits of the tail tags
        var data_buffer = tmpbuffer.slice(iv_length + 4, tmpbuffer.length - GCM_TAG_LENGTH);
        var cipher = Crypto.createDecipheriv('aes-128-gcm', key, iv_buffer);
        //setAuthTag buffer
        cipher.setAuthTag(tmpbuffer.slice(tmpbuffer.length - GCM_TAG_LENGTH, tmpbuffer.length));
        //setAAD buffer
        const buf = Buffer.allocUnsafe(6);
        buf.writeUIntBE(t, 0, 6);
        cipher.setAAD(buf);

        var msg = cipher.update(data_buffer);
        return msg.toString('utf8');
    }

    addMessageListener(listener) {
        this.message_listeners.add(listener);
    }

    removeMessageListener(listener) {
        this.message_listeners.delete(listener);
    }

}

module.exports = TuyaOpenMQ;
