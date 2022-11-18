# Changelog

This version has been completely rewritten in TypeScript, brings a lot of bug fix and device supported.


The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - (unreleased)

### Added
- Add config validation during plugin initialization.
- Add instruction message for handling API errors.
- Add debounce options for `sendCommands`, used for combine on/off command with LightBulb/Window/Fan slider values together.
- Persist TuyaDeviceList.json for debugging. (#41)
- Add unit test.
- Add support for whitelisting homes. (#84)
- Add CO Detector support (`cobj`).
- Add CO2 Detector support (`co2bj`).
- Add Water Detector support (`sj`).
- Add Temperature and Humidity Sensor support (`wsdcg`).
- Add Light Sensor support (`ldcg`).
- Add Motion Sensor support (`pir`).
- Add PM2.5 Detector support (`pm25`).
- Add Door and Window Controller support (`mc`).
- Add Curtain Switch support (`clkg`). (#8)
- Add Human Presence Sensor support (`hps`). (#17)
- Add Thermostat support (`wk`). (#19)
- Add Spotlight support (`sxd`). (#21)
- Add Irrigator support (`ggq`). (#28)
- Add Scene Light Socket support (`qjdcz`). (#33)
- Add Ceiling Fan Light support (`fsd`). (#37)
- Add Thermostat Valve support (`wkf`). (#50)
- Add Motion Sensor Light support (`gyd`). (#65)
- Add Multiple Dimmer and Dimmer Switch support (`tgq`, `tgkg`). (#82)
- Add Humidifier support (`jsq`). (#89)


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


### Changed
- Rewritten in TypeScript, brings benefits of type checking, smart code hints, etc.
- Reimplement accessory logics. More friendly for accessory developers. Legacy accessory code moved to `src/accessory/legacy/` folder.
- Update device info list polling logic. Less API errors.
- Now `Manufactor`, `Serial Number` and `Model` will be correctly displayed in HomeKit.
- All devices will be shown in HomeKit by default (Including unsupported device).


### Removed
- Remove `debug` option. Silence logs for users. For debugging, please refer to [troubleshooting](https://github.com/0x5e/homebridge-tuya-platform#troubleshooting).
- Remove `lang` option.
- Remove `username` and `password` options for `Custom` project. User will be created and authorized automatically. (#11)
