import { PlatformAccessory } from 'homebridge';
import TuyaDevice from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';

import BaseAccessory from './BaseAccessory';
import LightAccessory from './LightAccessory';
import OutletAccessory from './OutletAccessory';
import SwitchAccessory from './SwitchAccessory';
import GarageDoorAccessory from './GarageDoorAccessory';
import WindowAccessory from './WindowAccessory';
import WindowCoveringAccessory from './WindowCoveringAccessory';
import ContactSensorAccessory from './ContactSensorAccessory';
import LeakSensorAccessory from './LeakSensorAccessory';
import CarbonMonoxideSensorAccessory from './CarbonMonoxideSensorAccessory';
import CarbonDioxideSensorAccessory from './CarbonDioxideSensorAccessory';
import SmokeSensorAccessory from './SmokeSensorAccessory';
import TemperatureHumiditySensorAccessory from './TemperatureHumiditySensorAccessory';
import LightSensorAccessory from './LightSensorAccessory';
import MotionSensorAccessory from './MotionSensorAccessory';
import AirQualitySensorAccessory from './AirQualitySensorAccessory';

import LegacyAccessoryFactory from './LegacyAccessoryFactory';

export default class AccessoryFactory {
  static createAccessory(
    platform: TuyaPlatform,
    accessory: PlatformAccessory,
    device: TuyaDevice,
  ): BaseAccessory {

    let handler;
    switch (device.category) {
      case 'kj':
        // TODO AirPurifierAccessory
        break;
      case 'dj':
      case 'dd':
      case 'fwd':
      case 'tgq':
      case 'xdd':
      case 'dc':
      case 'tgkg':
        handler = new LightAccessory(platform, accessory);
        break;
      case 'cz':
      case 'pc':
        handler = new OutletAccessory(platform, accessory);
        break;
      case 'kg':
      case 'tdq':
        handler = new SwitchAccessory(platform, accessory);
        break;
      case 'fs':
      case 'fskg':
        // TODO Fanv2Accessory
        break;
      case 'ckmkzq':
        handler = new GarageDoorAccessory(platform, accessory);
        break;
      case 'mc':
        handler = new WindowAccessory(platform, accessory);
        break;
      case 'cl':
      case 'clkg':
        handler = new WindowCoveringAccessory(platform, accessory);
        break;
      case 'ywbj':
        handler = new SmokeSensorAccessory(platform, accessory);
        break;
      case 'qn':
        // TODO HeaterAccessory
        break;
      case 'mcs':
        handler = new ContactSensorAccessory(platform, accessory);
        break;
      case 'rqbj':
      case 'jwbj':
      case 'sj':
        handler = new LeakSensorAccessory(platform, accessory);
        break;
      case 'cobj':
        handler = new CarbonMonoxideSensorAccessory(platform, accessory);
        break;
      case 'co2bj':
        handler = new CarbonDioxideSensorAccessory(platform, accessory);
        break;
      case 'wsdcg':
        handler = new TemperatureHumiditySensorAccessory(platform, accessory);
        break;
      case 'ldcg':
        handler = new LightSensorAccessory(platform, accessory);
        break;
      case 'pir':
        handler = new MotionSensorAccessory(platform, accessory);
        break;
      case 'pm25':
        handler = new AirQualitySensorAccessory(platform, accessory);
        break;
    }

    if (!handler) {
      platform.log.warn(`Create accessory using legacy mode: ${device.name}.`);
      handler = LegacyAccessoryFactory.createAccessory(platform, accessory, device);
    }

    if (!handler) {
      platform.log.warn(`Unsupported device: ${device.name}.`);
      handler = new BaseAccessory(platform, accessory);
    }

    return handler;
  }
}
