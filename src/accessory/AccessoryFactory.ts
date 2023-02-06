import { PlatformAccessory } from 'homebridge';
import TuyaDevice from '../device/TuyaDevice';
import { TuyaPlatform } from '../platform';

import BaseAccessory from './BaseAccessory';
import LightAccessory from './LightAccessory';
import DimmerAccessory from './DimmerAccessory';
import OutletAccessory from './OutletAccessory';
import SwitchAccessory from './SwitchAccessory';
import WirelessSwitchAccessory from './WirelessSwitchAccessory';
import SceneSwitchAccessory from './SceneSwitchAccessory';
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
import DehumidifierAccessory from './DehumidifierAccessory';
import DiffuserAccessory from './DiffuserAccessory';
import AirPurifierAccessory from './AirPurifierAccessory';
import TemperatureHumidityIRSensorAccessory from './TemperatureHumidityIRSensorAccessory';
import CameraAccessory from './CameraAccessory';
import SceneAccessory from './SceneAccessory';
import AirConditionerAccessory from './AirConditionerAccessory';


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
      case 'dsd':
      case 'xdd':
      case 'fwd':
      case 'dc':
      case 'dd':
      case 'gyd':
      case 'tyndj':
      case 'sxd':
        handler = new LightAccessory(platform, accessory);
        break;
      case 'tgq':
      case 'tgkg':
        handler = new DimmerAccessory(platform, accessory);
        break;
      case 'cz':
      case 'pc':
      case 'wkcz':
        handler = new OutletAccessory(platform, accessory);
        break;
      case 'kg':
      case 'tdq':
      case 'qjdcz':
        handler = new SwitchAccessory(platform, accessory);
        break;
      case 'wxkg':
        handler = new WirelessSwitchAccessory(platform, accessory);
        break;
      case 'cjkg':
        handler = new SceneSwitchAccessory(platform, accessory);
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
      case 'sfkzq':
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
      case 'cocgq':
        handler = new CarbonMonoxideSensorAccessory(platform, accessory);
        break;
      case 'co2bj':
      case 'co2cgq':
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
      case 'pm2.5':
      case 'pm25cgq':
      case 'hjjcy':
        handler = new AirQualitySensorAccessory(platform, accessory);
        break;
      case 'hps':
        handler = new HumanPresenceSensorAccessory(platform, accessory);
        break;
      case 'jsq':
        handler = new HumidifierAccessory(platform, accessory);
        break;
      case 'cs':
        handler = new DehumidifierAccessory(platform, accessory);
        break;
      case 'xxj':
        handler = new DiffuserAccessory(platform, accessory);
        break;
      case 'kt':
      case 'ktkzq':
        handler = new AirConditionerAccessory(platform, accessory);
        break;
      case 'sp':
        handler = new CameraAccessory(platform, accessory);
        break;
      case 'scene':
        handler = new SceneAccessory(platform, accessory);
        break;
    }

    if (handler && !handler.checkRequirements()) {
      handler = undefined;
    }

    if (!handler) {
      platform.log.warn(`Unsupported device: ${device.name}.`);
      handler = new BaseAccessory(platform, accessory);
    }

    handler.configureServices();
    handler.configureStatusActive();
    handler.updateAllValues();
    handler.intialized = true;

    return handler;
  }
}
