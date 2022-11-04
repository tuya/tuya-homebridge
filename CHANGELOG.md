# Changelog

## v1.6.0-beta.x

### Added
- Add config validation on plugin start.
- Persist TuyaDeviceList.json for debugging (#41)
- Add instructions for handling API errors.

### Changed
- Rewritten in TypeScript, brings benefits of type checking, smart code hints, etc.
- Reimplement accessory logics. More friendly for accessory developers. Legacy accessory code moved to `src/accessory/legacy/` folder.
- Update device info list polling logic. Less API errors.
- `device manufactor`, `serial number` and `model` are now displayed in HomeKit.
- All devices will be shown in HomeKit by default. (Including unsupported device)
- Update unit test.
- Remove `debug` option. Silence logs for users.
- Remove `lang` option.
- Remove `username` and `password` options for `Custom` project. User will be created and authorized automatically. (#11)

### Fixed
- 1004 signature error when url query has more than 2 elements.
- 1010 token expired error when refresh access_token.
- 1106 permission error when polling device info list.
- 1100, 2017 errors when login. (via config validation)
- Fallback when receiving MQTT message with wrong order. (#35)

### Device specific
- [CarbonMonoxideSensor] Add CO Detector support (`cobj`).
- [CarbonDioxideSensor] Add CO2 Detector support (`co2bj`).
- [LeakSensor] Add Water Detector support (`sj`).
- [TemperatureSensor/HumiditySensor] Add Temperature and Humidity Sensor support (`wsdcg`).
- [LightSensor] Add Light Sensor support (`ldcg`).
- [MotionSensor] Add Motion Sensor support (`pir`).
- [AirQualitySensor] Add PM2.5 Detector support (`pm25`).
- [Window] Add Door and Window Controller support (`mc`).
- [Window] Add Curtain Switch support (`clkg`). (#8)
- [OccupancySensor] Add Human Presence Sensor support (`hps`). (#17)
- [Thermostat] Add Thermostat support (`wk`). (#19)
- [Light] Add Spotlight support (`sxd`). (#21)
- [Valve] Add Irrigator support (`ggq`). (#28)
- [Switch] Add Scene Light Socket support (qjdcz). (#33)
- [Fanv2] Add Ceiling Fan Light support (`fsd`). (#37)
