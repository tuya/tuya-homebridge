const BaseAccessory = require('./base_accessory')

 let Accessory;
 let Service;
 let Characteristic;
 let UUIDGen;

 class IRAirConditionerAccessory extends BaseAccessory {
   constructor(platform, homebridgeAccessory, deviceConfig) {

     ({ Accessory, Characteristic, Service } = platform.api.hap);
     super(
       platform,
       homebridgeAccessory,
       deviceConfig,
       Accessory.Categories.AIR_CONDITIONER,
       Service.HeaterCooler
     );

     this.statusArr = deviceConfig.status ? deviceConfig.status : [];
     this.refreshAccessoryServiceIfNeed(this.statusArr, false);
   }

   //init Or refresh AccessoryService
   refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
     this.isRefresh = isRefresh;

     // power
     this.normalAsync(Characteristic.Active, statusArr.power)

     // temperatures
     this.normalAsync(Characteristic.CurrentTemperature, statusArr.temp, {
       minValue: -30,
       maxValue: 100,
       minStep: 1
     })
     this.normalAsync(Characteristic.TemperatureDisplayUnits, 0, {
       minValue: 0,
       maxValue: 0,
       validValues: [0]
     })
     this.normalAsync(Characteristic.CoolingThresholdTemperature, statusArr.temp, {
       minValue: 16,
       maxValue: 32,
       minStep: 1
     })
     this.normalAsync(Characteristic.HeatingThresholdTemperature, statusArr.temp, {
       minValue: 16,
       maxValue: 32,
       minStep: 1
     })

     // mode
     this.normalAsync(Characteristic.CurrentHeaterCoolerState, this._convertTuyaToHomebridgeMode(statusArr.mode), {
       minValue: 0,
       maxValue: 3,
       validValues: [0, 1, 2, 3]
     })
     this.normalAsync(Characteristic.TargetHeaterCoolerState, this._convertTuyaToHomebridgeMode(statusArr.mode), {
       minValue: 0,
       maxValue: 2,
       validValues: [0, 1, 2]
     })
   }

   normalAsync(name, hbValue, props) {
     this.setCachedState(name, hbValue);
     if (this.isRefresh) {
       this.service
         .getCharacteristic(name)
         .updateValue(hbValue);
     } else {
       this.getAccessoryCharacteristic(name, props);
     }
   }

   getAccessoryCharacteristic(name, props) {
     //set  Accessory service Characteristic
     this.service.getCharacteristic(name)
       .setProps(props || {})
       .on('get', callback => {
         if (this.hasValidCache()) {
           callback(null, this.getCachedState(name));
         }
       })
       .on('set', (value, callback) => {
         if (name == Characteristic.CurrentHeaterCoolerState ||
             name == Characteristic.CurrentTemperature ||
             name == Characteristic.TemperatureDisplayUnits) {
           callback();
           return;
         }

         var param = this.getSendParam(name, value)
         this.platform.tuyaIRAPI.setACStatus(this.deviceConfig.id, this.deviceConfig.remote_id, param).then(() => {
           this.setCachedState(name, value);
           callback();
         }).catch((error) => {
           this.log.error('[SET][%s] Characteristic Error: %s', this.homebridgeAccessory.displayName, error);
           this.invalidateCache();
           callback(error);
         });
       });
   }

   //get Command SendData
   getSendParam(name, value) {
     var body = Object.assign({}, this.statusArr);
     switch (name) {
       case Characteristic.Active:
         body.power = value;
         break;
       case Characteristic.TargetHeaterCoolerState:
         body.power = 1;
         body.mode = this._convertHomebridgeToTuyaMode(value);
         break;
       case Characteristic.CoolingThresholdTemperature:
       case Characteristic.HeatingThresholdTemperature:
         body.power = 1;
         body.temp = value;
         break;
       case Characteristic.SwingMode:
        body.power = 1;
        body.swing = value;
        break;
       case Characteristic.RotationSpeed:
        body.power = 1;
        body.wind = Math.floor((value / 100) * 3);
        break;
       default:
         break;
     }
     return {
       "remote_index": this.deviceConfig.index,
       "category_id": this.deviceConfig.category,
       "power": body.power,
       "mode": body.mode,
       "temp": body.temp,
       "swing": body.swing,
       "wind": body.wind 
     };
   }

   _convertHomebridgeToTuyaMode(homebridgeState) {
    if (homebridgeState === 2) {
      return 0; // cooling
    }
    if (homebridgeState === 1) {
      return 1; // heating
    }
    return 2; // automatic 
   }

   _convertTuyaToHomebridgeMode(tuyaState) {
    if (tuyaState === 0) {
      return 2; // cooling     
    }
    if (tuyaState === 1) {
      return 1; // heating
    }
    return 0; // automatic 
   }

   //update device status
   updateState(data) {
     this.refreshAccessoryServiceIfNeed(data.status, true);
   }
 }

 module.exports = IRAirConditionerAccessory; 