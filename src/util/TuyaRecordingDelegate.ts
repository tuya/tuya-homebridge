/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  CameraRecordingConfiguration,
  CameraRecordingDelegate,
  HDSProtocolSpecificErrorReason,
  RecordingPacket,
} from 'homebridge';

export class TuyaRecordingDelegate implements CameraRecordingDelegate {
  updateRecordingActive(active: boolean): void {
    throw new Error('Method not implemented.');
  }

  updateRecordingConfiguration(configuration: CameraRecordingConfiguration | undefined): void {
    throw new Error('Method not implemented.');
  }

  handleRecordingStreamRequest(streamId: number): AsyncGenerator<RecordingPacket> {
    throw new Error('Method not implemented.');
  }

  acknowledgeStream?(streamId: number): void {
    throw new Error('Method not implemented.');
  }

  closeRecordingStream(streamId: number, reason: HDSProtocolSpecificErrorReason | undefined): void {
    throw new Error('Method not implemented.');
  }
}
