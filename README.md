# 0x5e/homebridge-tuya-platform

[![npm](https://badgen.net/npm/v/@0x5e/homebridge-tuya-platform)](https://npmjs.com/package/@0x5e/homebridge-tuya-platform)
[![npm](https://badgen.net/npm/dt/@0x5e/homebridge-tuya-platform)](https://npmjs.com/package/@0x5e/homebridge-tuya-platform)
[![mit-license](https://badgen.net/npm/license/@0x5e/homebridge-tuya-platform)](https://github.com/0x5e/homebridge-tuya-platform/blob/main/LICENSE)

Tuya plugin for Hombridge, maintained by @0x5e, former employee of Tuya.

Published as [@0x5e/homebridge-tuya-platform](https://npmjs.com/package/@0x5e/homebridge-tuya-platform), currently in beta version.

If beta version works fine for a while, it will be merged into the upstream repo.

## Features

- Optimized code, improved code readability and maintainability.
- Improved stability.
- Less duplicate code.
- Less API errors.
- Less development costs for new accessory categroies.
- More supported devices.

## Supported Tuya Devices

See [Supported Tuya Devices](./SUPPORTED_DEVICES.md)


## Changelogs

See [CHANGELOG.md](./CHANGELOG.md)


## Installation

Before use, please uninstall `homebridge-tuya-platform` first. They can't run together. (But the config is compatible, no need to delete.)

### For Homebridge UI users

Go to plugin page, search `@0x5e/homebridge-tuya-platform` and install.


### For Homebridge users

```
npm install @0x5e/homebridge-tuya-platform
```


## Todos

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
