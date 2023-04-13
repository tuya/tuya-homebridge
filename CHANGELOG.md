# Changelog

## [1.7.0] - (unreleased)

### Added
- Add scene support. (#118)
- Add Wireless Switch support (`wxkg`).
- Add Solar Light support (`tyndj`).
- Add Dehumidifier support (`cs`).
- Add Scene Switch support (`wxkg`).
- Add device overriding config support. "Non-standard DP" devices have possibility to be supported now. (#119)
- Add Camera support (`sp`). Thanks @ErrorErrorError for the contribution
- Add Air Conditioner support (`kt`). (#160)
- Add Air Conditioner Controller support (`ktkzq`). (#160)
- Add Diffuser support (`xxj`). (#175)
- Add Temperature Control Socket support (`wkcz`).
- Add Environmental Detector support (`hjjcy`).
- Add Water Valve Controller support (`sfkzq`).
- Add IR Remote Control support (`infrared_tv`, `infrared_stb`, `infrared_box`, `infrared_ac`, `infrared_fan`, `infrared_light`, `infrared_amplifier`, `infrared_projector`, `infrared_waterheater`, `infrared_airpurifier`). (#191)
- Add IR AC Controller support (`hwktwkq`).
- Add Fingerbot support (`szjqr`).
- Add Smart Lock support (`ms`, `jtmspro`). (#120) Thanks @pfgimutao for the contribution
- Add Alarm Host support (`mal`). (#246) Thanks @bFollon for the contribution
- Add Vibration Sensor support (`zd`). (#262)
- Add adaptive lighting support. (#272)
- Add Wireless Doorbell support (`wxml`). (277)


### Fixed
- Fix `RotationSpeed` missing one level. (#170)
- Fix `bright_value` not sent for the `C/CW` lights who doesn't have `work_mode`. (#171)
- Fix crash when camera sends an invalid status message.
- Fix incorrect Door and Window Controller state. (#178)
- Fix Thermostat cold mode not working (#242).


### Changed
- Support Ceiling Fan icon customize and Floor Fan `lock`, `swing` feature. (#131)
- Adjust humidity range of dehumidifier and humidifier.
- Print scene id in logs.
- Update support for RGB Power Switch (`dj`).
- Support showing device online status via `StatusActive`. (#172)
- Update unit and range of `RotationSpeed`, need clean accessory cache to take effect. (#174, #273)
- Support Diffuser RGB light. (#184)
- Support Fan light temperature and color. (#184)
- Support Humidifier light. (#184)
- Expose energy usage for outlets/switches. (#190) Thanks @lstrojny for the contribution
- Strict config validate for `deviceOverrides`. (#278)


## [1.6.0] - (2022.12.3)

This version has been completely rewritten in TypeScript, brings a lot of bug fix and new device support.

### New Accessories
- Add CO Detector support (`cobj`).
- Add CO2 Detector support (`co2bj`).
- Add Water Detector support (`sj`).
- Add Temperature and Humidity Sensor support (`wsdcg`, `wnykq`). Thanks @bimusiek for the contribution
- Add Light Sensor support (`ldcg`).
- Add Motion Sensor support (`pir`).
- Add PM2.5 Detector support (`pm25`).
- Add Door and Window Controller support (`mc`).
- Add Curtain Switch support (`clkg`). (#8)
- Add Human Presence Sensor support (`hps`). (#17)
- Add Thermostat support (`wk`). (#19) Thanks @burcadoruciprian for the contribution
- Add Spotlight support (`sxd`). (#21)
- Add Irrigator support (`ggq`). (#28)
- Add Scene Light Socket support (`qjdcz`). (#33)
- Add Ceiling Fan Light support (`fsd`). (#37)
- Add Thermostat Valve support (`wkf`). (#50)
- Add Motion Sensor Light support (`gyd`). (#65)
- Add Multiple Dimmer and Dimmer Switch support (`tgq`, `tgkg`). (#82)
- Add Humidifier support (`jsq`). (#89) Thanks @akaminsky-net for the contribution


### Added
- Add config validation during plugin initialization.
- Add instruction message for handling API errors.
- Add debounce in `BaseAccessory.sendCommands()` for better API request peformance.
- Persist `TuyaDeviceList.{uid}.json` for debugging. (#41)
- Add `homeWhitelist` option for whitelisting homes. (#84) Thanks @JulianLepinski for the contribution


### Fixed
- Fix 1004 signature error when url query has more than 2 elements.
- Fix 1010 token expired error when refresh access_token.
- Fix 1106 permission error when polling device info list.
- Fix 1100, 2017 errors when login. (via config validation)
- Fix Lightbulb `RGBW` and `RGBCW` work mode not switched properly (#12 #56 #59)
- Fix Lightbulb color temperature not working. (#13)
- Fix Thermostat temperature units handling. (#20)
- Fix Thermostat mode handling. (#26)
- Fix Curtain Switch with no position feature. (#27)
- Fallback when receiving MQTT message with wrong order. (#35)
- Fix wrong temperature on sensor. (#38)
- Fix fan speed issue. (#46 #51)
- Workaround for Thermostat with wrong schema property (#74)
- Fix Contact Sensor not working (#75)
- Fix iOS 16 default accessory name issue. (#85)


### Changed
- Rewritten in TypeScript, brings benefits of type checking, smart code hints, etc.
- Reimplement accessory logics. More friendly for accessory developers.
- Update device info list polling logic. Less API errors.
- Now `Manufactor`, `Serial Number` and `Model` will be correctly displayed in HomeKit.
- All devices will be shown in HomeKit by default (Including unsupported device).
- Updated unit test.
- Updated documentations. Thanks @prabch for the contribution


### Removed
- Remove `debug` option. Silence logs for users. For debugging, please refer to [troubleshooting](https://github.com/0x5e/homebridge-tuya-platform#troubleshooting).
- Remove `lang` option.
- Remove `username` and `password` options for `Custom` project. User will be created and authorized automatically. (#11)
