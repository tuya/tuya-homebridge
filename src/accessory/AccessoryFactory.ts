import { PlatformAccessory } from 'homebridge';
import TuyaDevice from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';

import BaseAccessory from './BaseAccessory';
import LightAccessory from './LightAccessory';
import DimmerAccessory from './DimmerAccessory';
import OutletAccessory from './OutletAccessory';
import SwitchAccessory from './SwitchAccessory';
import FanAccessory from './FanAccessory';
import GarageDoorAccessory from './GarageDoorAccessory';
import WindowAccessory from './WindowAccessory';
import WindowCoveringAccessory from './WindowCoveringAccessory';
import ThermostatAccessory from './ThermostatAccessory';
import HeaterAccessory from './HeaterAccessory';
import ValveAccessory from './ValveAccessory';
import ContactSensorAccessory from './ContactSensorAccessory';
import LeakSensorAccessory from './LeakSensorAccessory';
import CarbonMonoxideSensorAccessory from './CarbonMonoxideSensorAccessory';
import CarbonDioxideSensorAccessory from './CarbonDioxideSensorAccessory';
import SmokeSensorAccessory from './SmokeSensorAccessory';
import TemperatureHumiditySensorAccessory from './TemperatureHumiditySensorAccessory';
import LightSensorAccessory from './LightSensorAccessory';
import MotionSensorAccessory from './MotionSensorAccessory';
import AirQualitySensorAccessory from './AirQualitySensorAccessory';
import HumanPresenceSensorAccessory from './HumanPresenceSensorAccessory';
import HumidifierAccessory from './HumidifierAccessory';
import AirPurifierAccessory from './AirPurifierAccessory';
import TemperatureHumidityIRSensorAccessory from './TemperatureHumidityIRSensorAccessory';
import SceneAccessory from './SceneAccessory';


export default class AccessoryFactory {
  static createAccessory(
    platform: TuyaPlatform,
    accessory: PlatformAccessory,
    device: TuyaDevice,
  ): BaseAccessory {

    let handler : BaseAccessory | undefined;
    switch (device.category) {
      case 'kj':
        handler = new AirPurifierAccessory(platform, accessory);
        break;
      case 'dj':
      case 'xdd':
      case 'fwd':
      case 'dc':
      case 'dd':
      case 'gyd':
      case 'sxd':
        handler = new LightAccessory(platform, accessory);
        break;
      case 'tgq':
      case 'tgkg':
        handler = new DimmerAccessory(platform, accessory);
        break;
      case 'cz':
      case 'pc':
        handler = new OutletAccessory(platform, accessory);
        break;
      case 'kg':
      case 'tdq':
      case 'qjdcz':
        handler = new SwitchAccessory(platform, accessory);
        break;
      case 'fs':
      case 'fsd':
      case 'fskg':
        handler = new FanAccessory(platform, accessory);
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
      case 'wk':
      case 'wkf':
        handler = new ThermostatAccessory(platform, accessory);
        break;
      case 'qn':
        handler = new HeaterAccessory(platform, accessory);
        break;
      case 'ggq':
        handler = new ValveAccessory(platform, accessory);
        break;
      case 'ywbj':
        handler = new SmokeSensorAccessory(platform, accessory);
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
      case 'wnykq':
        handler = new TemperatureHumidityIRSensorAccessory(platform, accessory);
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
      case 'hps':
        handler = new HumanPresenceSensorAccessory(platform, accessory);
        break;
      case 'jsq':
        handler = new HumidifierAccessory(platform, accessory);
        break;
      case 'scene':
        handler = new SceneAccessory(platform, accessory);
        break;
    }

    handler && handler.checkRequirements() && handler.configureServices();

    if (!handler) {
      platform.log.warn(`Unsupported device: ${device.name}.`);
      handler = new BaseAccessory(platform, accessory);
    }

    return handler;
  }
}
