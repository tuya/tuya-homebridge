/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-len */

import {
  AudioStreamingCodecType,
  AudioStreamingSamplerate,
  CameraController,
  CameraControllerOptions,
  CameraRecordingOptions,
  CameraStreamingDelegate,
  CameraStreamingOptions,
  EventTriggerOption,
  HAP,
  H264Level,
  H264Profile,
  MediaContainerType,
  PrepareStreamCallback,
  PrepareStreamRequest,
  Resolution,
  SnapshotRequest,
  SnapshotRequestCallback,
  SRTPCryptoSuites,
  StreamingRequest,
  StreamRequestCallback,
  PrepareStreamResponse,
  StartStreamRequest,
} from 'homebridge';

import {
  defaultFfmpegPath,
  reservePorts,
} from '@homebridge/camera-utils';

import CameraAccessory from '../accessory/CameraAccessory';

import {
  TuyaRecordingDelegate,
} from './TuyaRecordingDelegate';
import { spawn } from 'child_process';
import { createSocket, Socket } from 'dgram';
import { FfmpegStreamingProcess, StreamingDelegate as FfmpegStreamingDelegate } from './FfmpegStreamingProcess';

interface SessionInfo {
    address: string; // address of the HAP controller
    addressVersion: 'ipv4' | 'ipv6';

    videoPort: number;
    videoIncomingPort: number;
    videoCryptoSuite: SRTPCryptoSuites; // should be saved if multiple suites are supported
    videoSRTP: Buffer; // key and salt concatenated
    videoSSRC: number; // rtp synchronisation source

    audioPort: number;
    audioIncomingPort: number;
    audioCryptoSuite: SRTPCryptoSuites;
    audioSRTP: Buffer;
    audioSSRC: number;
}

type ActiveSession = {
    mainProcess?: FfmpegStreamingProcess;
    returnProcess?: FfmpegStreamingProcess;
    timeout?: NodeJS.Timeout;
    socket?: Socket;
};

/*
interface SampleRateEntry {
    type: AudioRecordingCodecType;
    bitrateMode: number;
    samplerate: AudioRecordingSamplerate[];
    audioChannels: number;
}
*/

export class TuyaStreamingDelegate implements CameraStreamingDelegate, FfmpegStreamingDelegate {
  public readonly controller: CameraController;

  private pendingSessions: { [index: string]: SessionInfo } = {};
  private ongoingSessions: { [index: string]: ActiveSession } = {};

  private readonly camera: CameraAccessory;
  private readonly hap: HAP;
  constructor(camera: CameraAccessory) {
    this.camera = camera;
    this.hap = camera.platform.api.hap;

    // this.recordingDelegate = new TuyaRecordingDelegate();

    const resolutions: Resolution[] = [
      [320, 180, 30],
      [320, 240, 15],
      [320, 240, 30],
      [480, 270, 30],
      [480, 360, 30],
      [640, 360, 30],
      [640, 480, 30],
      [1280, 720, 30],
      [1280, 960, 30],
      [1920, 1080, 30],
      [1600, 1200, 30],
    ];

    const streamingOptions: CameraStreamingOptions = {
      supportedCryptoSuites: [SRTPCryptoSuites.AES_CM_128_HMAC_SHA1_80],
      video: {
        codec: {
          profiles: [H264Profile.BASELINE, H264Profile.MAIN, H264Profile.HIGH],
          levels: [H264Level.LEVEL3_1, H264Level.LEVEL3_2, H264Level.LEVEL4_0],
        },
        resolutions: resolutions,
      },
      audio: {
        twoWayAudio: false,
        codecs: [
          {
            type: AudioStreamingCodecType.AAC_ELD,
            samplerate: AudioStreamingSamplerate.KHZ_16,
          },
        ],
      },
    };

    const recordingOptions: CameraRecordingOptions = {
      overrideEventTriggerOptions: [
        EventTriggerOption.MOTION,
        EventTriggerOption.DOORBELL,
      ],
      prebufferLength: 4 * 1000, // prebufferLength always remains 4s ?
      mediaContainerConfiguration: [
        {
          type: MediaContainerType.FRAGMENTED_MP4,
          fragmentLength: 4000,
        },
      ],
      video: {
        parameters: {
          profiles: [
            H264Profile.BASELINE,
            H264Profile.MAIN,
            H264Profile.HIGH,
          ],
          levels: [
            H264Level.LEVEL3_1,
            H264Level.LEVEL3_2,
            H264Level.LEVEL4_0,
          ],
        },
        resolutions: resolutions,
        type: this.hap.VideoCodecType.H264,
      },
      audio: {
        codecs: [
          {
            samplerate: this.hap.AudioRecordingSamplerate.KHZ_32,
            type: this.hap.AudioRecordingCodecType.AAC_LC,
          },
        ],
      },
    };

    const options: CameraControllerOptions = {
      delegate: this,
      streamingOptions: streamingOptions,
      // recording: {
      // options: recordingOptions,
      // delegate: this.recordingDelegate
      // }
    };

    this.controller = new this.hap.CameraController(options);
  }

  stopStream(sessionId: string): void {
    const session = this.ongoingSessions[sessionId];

    if (session) {
      if (session.timeout) {
        clearTimeout(session.timeout);
      }

      try {
        session.socket?.close();
      } catch (error) {
        this.camera.log.error(`Error occurred closing socket: ${error}`, this.camera.accessory.displayName, 'Homebridge');
      }

      try {
        session.mainProcess?.stop();
      } catch (error) {
        this.camera.log.error(
          `Error occurred terminating main FFmpeg process: ${error}`,
          this.camera.accessory.displayName,
          'Homebridge',
        );
      }

      try {
        session.returnProcess?.stop();
      } catch (error) {
        this.camera.log.error(
          `Error occurred terminating two-way FFmpeg process: ${error}`,
          this.camera.accessory.displayName,
          'Homebridge',
        );
      }

      delete this.ongoingSessions[sessionId];

      this.camera.log.info('Stopped video stream.', this.camera.accessory.displayName);
    }
  }

  forceStopStream(sessionId: string) {
    this.controller.forceStopStreamingSession(sessionId);
  }

  async handleSnapshotRequest(
    request: SnapshotRequest,
    callback: SnapshotRequestCallback,
  ) {
    try {
      this.camera.log.debug(`Snapshot requested: ${request.width} x ${request.height}`, this.camera.accessory.displayName);

      const snapshot = await this.fetchSnapshot();

      this.camera.log.debug(
        'Sending snapshot',
        this.camera.accessory.displayName,
      );

      callback(undefined, snapshot);
    } catch (error) {
      callback(error as Error);
    }
  }

  async prepareStream(
    request: PrepareStreamRequest,
    callback: PrepareStreamCallback,
  ) {
    const videoIncomingPort = await reservePorts({
      count: 1,
    });
    const videoSSRC = this.hap.CameraController.generateSynchronisationSource();

    const audioIncomingPort = await reservePorts({
      count: 1,
    });
    const audioSSRC = this.hap.CameraController.generateSynchronisationSource();

    const sessionInfo: SessionInfo = {
      address: request.targetAddress,
      addressVersion: request.addressVersion,

      audioCryptoSuite: request.audio.srtpCryptoSuite,
      audioPort: request.audio.port,
      audioSRTP: Buffer.concat([request.audio.srtp_key, request.audio.srtp_salt]),
      audioSSRC: audioSSRC,
      audioIncomingPort: audioIncomingPort[0],

      videoCryptoSuite: request.video.srtpCryptoSuite,
      videoPort: request.video.port,
      videoSRTP: Buffer.concat([request.video.srtp_key, request.video.srtp_salt]),
      videoSSRC: videoSSRC,
      videoIncomingPort: videoIncomingPort[0],
    };

    const response: PrepareStreamResponse = {
      video: {
        port: sessionInfo.videoIncomingPort,
        ssrc: videoSSRC,
        srtp_key: request.video.srtp_key,
        srtp_salt: request.video.srtp_salt,
      },
      audio: {
        port: sessionInfo.audioIncomingPort,
        ssrc: audioSSRC,
        srtp_key: request.audio.srtp_key,
        srtp_salt: request.audio.srtp_salt,
      },
    };

    this.pendingSessions[request.sessionID] = sessionInfo;
    callback(undefined, response);
  }

  async handleStreamRequest(
    request: StreamingRequest,
    callback: StreamRequestCallback,
  ) {
    switch (request.type) {
      case this.hap.StreamRequestTypes.START: {
        this.camera.log.debug(
          `Start stream requested: ${request.video.width}x${request.video.height}, ${request.video.fps} fps, ${request.video.max_bit_rate} kbps`,
          this.camera.accessory.displayName,
        );

        await this.startStream(request, callback);
        break;
      }

      case this.hap.StreamRequestTypes.RECONFIGURE: {
        this.camera.log.debug(
          `Reconfigure stream requested: ${request.video.width}x${request.video.height}, ${request.video.fps} fps, ${request.video.max_bit_rate} kbps (Ignored)`,
          this.camera.accessory.displayName,
        );

        callback();
        break;
      }

      case this.hap.StreamRequestTypes.STOP: {
        this.camera.log.debug('Stop stream requested', this.camera.accessory.displayName);

        this.stopStream(request.sessionID);
        callback();
        break;
      }
    }
  }

  private async retrieveDeviceRTSP(): Promise<string> {
    const data = await this.camera.deviceManager.api.post(
      `/v1.0/devices/${this.camera.device.id}/stream/actions/allocate`,
      {
        type: 'rtsp',
      },
    );

    return data.result.url;
  }

  private async startStream(request: StartStreamRequest, callback: StreamRequestCallback) {
    const sessionInfo = this.pendingSessions[request.sessionID];

    if (!sessionInfo) {
      this.camera.log.error('Error finding session information.', this.camera.accessory.displayName);
      callback(new Error('Error finding session information'));
    }

    const vcodec = 'libx264';
    const mtu = 1316; // request.video.mtu is not used

    const fps = request.video.fps;
    const videoBitrate = request.video.max_bit_rate;

    const rtspUrl = await this.retrieveDeviceRTSP();

    const ffmpegArgs: string[] = [
      '-hide_banner',
      '-loglevel', 'verbose',
      '-i', rtspUrl,
      '-an', '-sn', '-dn',
      '-r', fps.toString(),
      '-codec:v', vcodec,
      '-pix_fmt', 'yuv420p',
      '-color_range', 'mpeg',
      '-f', 'rawvideo',
    ];

    const encoderOptions = '-preset ultrafast -tune zerolatency';

    if (encoderOptions) {
      ffmpegArgs.push(...encoderOptions.split(/\s+/));
    }

    if (videoBitrate > 0) {
      ffmpegArgs.push('-b:v', `${videoBitrate}k`);
    }

    // Video Stream

    ffmpegArgs.push(
      '-payload_type', `${request.video.pt}`,
      '-ssrc', `${sessionInfo.videoSSRC}`,
      '-f', 'rtp',
      '-srtp_out_suite', 'AES_CM_128_HMAC_SHA1_80',
      '-srtp_out_params', sessionInfo.videoSRTP.toString('base64'),
      `srtp://${sessionInfo.address}:${sessionInfo.videoPort}?rtcpport=${sessionInfo.videoPort}&pkt_size=${mtu}`,
    );

    // Setting up audio

    if (
      request.audio.codec === AudioStreamingCodecType.OPUS ||
            request.audio.codec === AudioStreamingCodecType.AAC_ELD
    ) {
      ffmpegArgs.push('-vn', '-sn', '-dn');

      if (request.audio.codec === AudioStreamingCodecType.OPUS) {
        ffmpegArgs.push('-acodec', 'libopus', '-application', 'lowdelay');
      } else {
        ffmpegArgs.push('-acodec', 'libfdk_aac', '-profile:a', 'aac_eld');
      }

      ffmpegArgs.push(
        '-flags', '+global_header',
        '-f', 'null',
        '-ar', `${request.audio.sample_rate}k`,
        '-b:a', `${request.audio.max_bit_rate}k`,
        '-ac', `${request.audio.channel}`,
        '-payload_type', `${request.audio.pt}`,
        '-ssrc', `${sessionInfo.audioSSRC}`,
        '-f', 'rtp',
        '-srtp_out_suite', 'AES_CM_128_HMAC_SHA1_80',
        '-srtp_out_params', sessionInfo.audioSRTP.toString('base64'),
        `srtp://${sessionInfo.address}:${sessionInfo.audioPort}?rtcpport=${sessionInfo.audioPort}&pkt_size=188`,
      );
    } else {
      this.camera.log.error(
        `Unsupported audio codec requested: ${request.audio.codec}`,
        this.camera.accessory.displayName,
        'Homebridge',
      );
    }

    ffmpegArgs.push('-progress', 'pipe:1');

    const activeSession: ActiveSession = {};

    activeSession.socket = createSocket(sessionInfo.addressVersion === 'ipv6' ? 'udp6' : 'udp4');

    activeSession.socket.on('error', (err: Error) => {
      this.camera.log.error('Socket error: ' + err.message, this.camera.accessory.displayName);
      this.stopStream(request.sessionID);
    });

    activeSession.socket.on('message', () => {
      if (activeSession.timeout) {
        clearTimeout(activeSession.timeout);
      }
      activeSession.timeout = setTimeout(() => {
        this.camera.log.info('Device appears to be inactive. Stopping stream.', this.camera.accessory.displayName);
        this.controller.forceStopStreamingSession(request.sessionID);
        this.stopStream(request.sessionID);
      }, request.video.rtcp_interval * 5 * 1000);
    });

    activeSession.socket.bind(sessionInfo.videoIncomingPort);

    activeSession.mainProcess = new FfmpegStreamingProcess(
      this.camera.accessory.displayName,
      request.sessionID,
      defaultFfmpegPath,
      ffmpegArgs,
      this.camera.log,
      true,
      this,
      callback,
    );

    this.ongoingSessions[request.sessionID] = activeSession;
    delete this.pendingSessions[request.sessionID];
  }

  private async fetchSnapshot(): Promise<Buffer> {
    this.camera.log.debug('Running Snapshot commands for %s', this.camera.accessory.displayName);

    if (!this.camera.device.online) {
      throw new Error(`${this.camera.accessory.displayName} is currently offline.`);
    }

    // TODO: Check if there is a stream already running to fetch snapshot.

    const rtspUrl = await this.retrieveDeviceRTSP();

    const ffmpegArgs = [
      '-i', rtspUrl,
      '-frames:v', '1',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'image2',
      '-',
    ];

    return new Promise((resolve, reject) => {

      const ffmpeg = spawn(
        defaultFfmpegPath,
        ffmpegArgs.map(x => x.toString()),
        { env: process.env },
      );

      let errors: string[] = [];

      let snapshotBuffer = Buffer.alloc(0);

      ffmpeg.stdout.on('data', (data) => {
        snapshotBuffer = Buffer.concat([snapshotBuffer, data]);
      });

      ffmpeg.on('error', (error) => {
        this.camera.log.error(
          `FFmpeg process creation failed: ${error.message} - Showing "offline" image instead.`,
          this.camera.accessory.displayName,
        );
        reject('Failed to fetch snapshot.');
      });

      ffmpeg.stderr.on('data', (data) => {
        errors = errors.slice(-5);
        errors.push(data.toString().replace(/(\r\n|\n|\r)/gm, ' '));
      });

      ffmpeg.on('close', () => {
        if (snapshotBuffer.length > 0) {
          resolve(snapshotBuffer);
        } else {
          this.camera.log.error('Failed to fetch snapshot. Showing "offline" image instead.', this.camera.accessory.displayName);

          if (errors.length > 0) {
            this.camera.log.error(errors.join(' - '), this.camera.accessory.displayName, 'Homebridge');
          }

          reject(`Unable to fetch snapshot for: ${this.camera.accessory.displayName}`);
        }
      });
    });
  }
}
