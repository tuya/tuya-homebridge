import { Service } from 'homebridge';
import { TuyaDeviceSchema } from '../../device/TuyaDevice';
import BaseAccessory from '../BaseAccessory';
import SecuritySystemAccessory from '../SecuritySystemAccessory';

const TUYA_CODES = {
  MASTER_MODE: {
    ARMED: 'arm',
    DISARMED: 'disarmed',
    HOME: 'home',
  },
};

function getTuyaHomebridgeMap(accessory: BaseAccessory) {
  const tuyaHomebridgeMap = new Map();

  tuyaHomebridgeMap.set(TUYA_CODES.MASTER_MODE.ARMED, accessory.Characteristic.SecuritySystemCurrentState.AWAY_ARM);
  tuyaHomebridgeMap.set(TUYA_CODES.MASTER_MODE.DISARMED, accessory.Characteristic.SecuritySystemCurrentState.DISARMED);
  tuyaHomebridgeMap.set(TUYA_CODES.MASTER_MODE.HOME, accessory.Characteristic.SecuritySystemCurrentState.STAY_ARM);
  tuyaHomebridgeMap.set(accessory.Characteristic.SecuritySystemCurrentState.AWAY_ARM, TUYA_CODES.MASTER_MODE.ARMED);
  tuyaHomebridgeMap.set(accessory.Characteristic.SecuritySystemCurrentState.DISARMED, TUYA_CODES.MASTER_MODE.DISARMED);
  tuyaHomebridgeMap.set(accessory.Characteristic.SecuritySystemCurrentState.STAY_ARM, TUYA_CODES.MASTER_MODE.HOME);
  tuyaHomebridgeMap.set(accessory.Characteristic.SecuritySystemCurrentState.NIGHT_ARM, TUYA_CODES.MASTER_MODE.HOME);

  return tuyaHomebridgeMap;
}

export function configureSecuritySystemCurrentState(accessory: SecuritySystemAccessory, service: Service,
  masterModeSchema?: TuyaDeviceSchema, sosStateSchema?: TuyaDeviceSchema) {
  if (!masterModeSchema || !sosStateSchema) {
    return;
  }

  const tuyaHomebridgeMap = getTuyaHomebridgeMap(accessory);

  service.getCharacteristic(accessory.Characteristic.SecuritySystemCurrentState)
    .onGet(() => {
      const alarmTriggered = accessory.getStatus(sosStateSchema.code)!.value;

      if (alarmTriggered) {
        return accessory.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
      } else {
        const currentState = accessory.getStatus(masterModeSchema.code)!.value;
        if (currentState === TUYA_CODES.MASTER_MODE.HOME) {
          return accessory.isNightArm ? accessory.Characteristic.SecuritySystemCurrentState.NIGHT_ARM :
            accessory.Characteristic.SecuritySystemCurrentState.STAY_ARM;
        }

        return tuyaHomebridgeMap.get(currentState);
      }
    });
}

export function configureSecuritySystemTargetState(accessory: SecuritySystemAccessory, service: Service,
  masterModeSchema?: TuyaDeviceSchema, sosStateSchema?: TuyaDeviceSchema) {
  if (!masterModeSchema || !sosStateSchema) {
    return;
  }

  const tuyaHomebridgeMap = getTuyaHomebridgeMap(accessory);

  service.getCharacteristic(accessory.Characteristic.SecuritySystemTargetState)
    .onGet(() => {
      const currentState = accessory.getStatus(masterModeSchema.code)!.value;
      if (currentState === TUYA_CODES.MASTER_MODE.HOME) {
        return accessory.isNightArm ? accessory.Characteristic.SecuritySystemCurrentState.NIGHT_ARM :
          accessory.Characteristic.SecuritySystemCurrentState.STAY_ARM;
      }

      return tuyaHomebridgeMap.get(currentState);
    })
    .onSet(value => {

      const sosState = accessory.getStatus(sosStateSchema.code)?.value;

      // If we received a request to disarm the alarm, we make sure sos_state is set to false
      if (sosState && value === accessory.Characteristic.SecuritySystemTargetState.DISARM) {
        accessory.sendCommands([{
          code: sosStateSchema.code,
          value: false,
        }], true);
      }

      accessory.isNightArm = value === accessory.Characteristic.SecuritySystemTargetState.NIGHT_ARM;

      accessory.sendCommands([{
        code: masterModeSchema.code,
        value: tuyaHomebridgeMap.get(value),
      }], true);
    });
}
