# Changelog

## v1.6.0-beta.x

### Changed
- Rewritten in TypeScript, brings benefits of type checking, smart code hints, etc.
- Reimplement accessory logics. More friendly for accessory developers. (old accessory class still compatible to use yet)
- Update device info list polling logic. Less errors.
- Add `AMERICA_EAST` and `EUROPE_WEST` endpoints.
- Add config validation on plugin start.
- Add device manufactor, serial number (device id) and model displayed in HomeKit.
- Add GitHub action `Build and Lint`.
- Add instruction log when API failed with 1106 permission errors.
- Remove `debug` option. Silence logs for users. For debugging, please start homebridge in debug mode: `homebridge -D`
- Remove `lang` option.
- Update unit test.

### Fixed
- 1004 signature error when url query has more than 2 elements.
- 1106 permission error when polling device info list.
- Fix access_token undefined error. (https://github.com/tuya/tuya-homebridge/issues/298#issuecomment-1278238870 by @Azukovskij )

### Accessory category specific
- Rewrite `BaseAccessory`, `SwitchAccessory`, `OutletAccessory`, `LightAccessory`, reduce about 50% code size. Now writing a `BaseAccessory` child class is much more simple.
- Add `debounce` and command send queue for `LightAccessory`, more stable during frequent operations on different characteristics.
- Legacy accessory codes moved to `src/accessory/legacy/` folder.
- Fix wrong color temperature map. (https://github.com/tuya/tuya-homebridge/issues/136 by @XiaoTonyLuo and https://github.com/tuya/tuya-homebridge/pull/135 by @levidhuyvetter)

### Known issue
- `LightAccessory` may not work properly, espasially on work mode change. need more test and info.
- Sometimes mqtt not respond quickly, will influence the accessory status update. still addressing the issue.
