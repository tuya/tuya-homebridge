# 0x5e/homebridge-tuya-platform (beta)

Tuya plugin for Hombridge, maintained by @0x5e, former employee of Tuya.

## Intruduction

The main goal of this fork is to:
- Improve code readability and maintainability.
- Improve stability.
- Remove duplicate code.
- Reduce development costs for categroies.

Will be published to `@0x5e/homebridge-tuya-platform` as the beta version, Have a try :)

If all things looks fine, I will let my colleague merge into the official repo.

## Changes from tuya/tuya-homebridge

- Rewritten in TypeScript, brings benefits of type checking, smart code hints, etc.
- Rewrite device info list polling logic, less permission error.
- Rewrite accessory logic.
    - Reduce about 50% code amount at present.
    - Add debounce on LightAccessory send commands, more stable during frequent operations.
- Add device manufactor, serial number (device id) and model displayed in HomeKit.
- Add config validation.
- Remove `debug` and `lang` option. For debugging, please start homebridge in debug mode: `homebridge -D`

## Todo list before merge

- Translate existing accessory code (or try to be compatible with them) and test.
    - [x] Base
    - [x] Switch
    - [x] Outlet
    - [x] Light
    - [ ] Air Purifier
    - [ ] Fan
    - [ ] Contact Sensor
    - [ ] Garage Door
    - [ ] Heater
    - [ ] Leak Sensor
    - [ ] Smoke Sensor
    - [ ] Window Covering
- Test on `Custom` project type.
- Plugin upgrade compatibility test.

## Todo list after merge

- Advanced config options
    - Display specific home's device list
    - Switch to show/hidden additional device functions, such as Child Lock, Backlight, Scene, Fan Level.
- Detail documentation for accessory category develop and usage.

## How to contribute

- Clone the code.
- Install Development Dependencies (`npm install`).
- Link to Homebridge (`npm link`).
- Update code.
- Build (`npm run build`).
- Start Homebridge (`homebridge -D`).

For details, please see https://github.com/homebridge/homebridge-plugin-template

PRs and issues are welcome.
