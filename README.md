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

See [CHANGELOG.md](./CHANGELOG.md)

## Todo list before merge

- Re-write legacy accessory class and test.
    - ~~Base~~
    - ~~Switch~~
    - ~~Outlet~~
    - ~~Light~~
    - Air Purifier
    - Fan
    - Contact Sensor
    - Garage Door
    - Heater
    - Leak Sensor
    - Smoke Sensor
    - Window Covering
- Test on `Custom` project type.
- ~~Plugin upgrade compatibility test.~~

## Todo list after merge

- Advanced config options
    - Display specific home's device list
    - Switch to show/hidden additional device functions, such as Child Lock, Backlight, Scene, Fan Level.
- Detail documentation for accessory category develop and usage.
- `productId` specific accessory

## How to contribute

- Clone the code.
- Install Development Dependencies (`npm install`).
- Link to Homebridge (`npm link`).
- Update code.
- Build (`npm run build`).
- Start Homebridge (`homebridge -D`).

For details, please see https://github.com/homebridge/homebridge-plugin-template

PRs and issues are welcome.

### Adding new accessory type

**notice: API not stable yet, may changed in the future.**

1. Create a class extend from `src/accessory/BaseAccessory.ts`.
2. Implement `configureService` method, add `Service` and `Characteristic` depends to the device's `functions` and `status`.

For every `Characteristic` related to the device's state, implement `onGet` and `onSet` handlers.

Get latest device state from `XXXAccessory.device.status`, and send commands using `XXXAccessory.deviceManager.sendCommands(deviceID, commands);`.

3. Add `XXXAccessory` into `src/accessory/AccessoryFactory.ts`.
4. All done. `BaseAccessory` will handle mqtt update automatically.
