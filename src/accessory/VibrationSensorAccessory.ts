import { TuyaDeviceStatus } from '../device/TuyaDevice';
import BaseAccessory from './BaseAccessory';

const SCHEMA_CODE = {
  STATE: ['shock_state'],
};

export default class VibrationSensorAccessory extends BaseAccessory {

  requiredSchema() {
    return [SCHEMA_CODE.STATE];
  }

  configureServices() {
    this.getMotionService().setCharacteristic(this.Characteristic.MotionDetected, false);
  }

  getMotionService() {
    return this.accessory.getService(this.Service.MotionSensor)
      || this.accessory.addService(this.Service.MotionSensor);
  }

  async onDeviceStatusUpdate(status: TuyaDeviceStatus[]) {
    super.onDeviceStatusUpdate(status);

    const motionSchema = this.getSchema(...SCHEMA_CODE.STATE)!;
    const motionStatus = status.find(_status => _status.code === motionSchema.code);
    motionStatus && this.onMotionDetected(motionStatus);
  }

  private timer?: NodeJS.Timeout;
  onMotionDetected(status: TuyaDeviceStatus) {
    if (!this.intialized) {
      return;
    }

    if (status.value !== 'vibration' && status.value !== 'drop') {
      return;
    }

    this.log.info('Motion event:', status.value);
    const characteristic = this.getMotionService().getCharacteristic(this.Characteristic.MotionDetected);
    characteristic.updateValue(true);

    this.timer && clearTimeout(this.timer);
    this.timer = setTimeout(() => characteristic.updateValue(false), 3 * 1000);
  }

}
