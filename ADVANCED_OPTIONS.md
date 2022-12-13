# Advanced Options

**During the beta version, the options are unstable, may get changed during updates.**

Before config, you need to know about [Tuya IoT Development Platform > Cloud Development > Standard Instruction Set > Data Type](https://developer.tuya.com/en/docs/iot/datatypedescription?id=K9i5ql2jo7j1k), and a little programming skills of writing very basic JavaScript code.


### Configuration

- `options.deviceOverrides` - **optional**: An array of device overriding config objects.
- `options.deviceOverrides[].id` - **required**: Device ID, Product ID, Scene ID, or `global`.
<!--
- `options.deviceOverrides[].accessoryCategory` - **optional**: Accessory Category ID. Overriding this property can change accessory's icon. See: [Homebridge Plugin Documentation > Categories](https://developers.homebridge.io/#/categories)
-->
- `options.deviceOverrides[].category` - **optional**: Device category code. See [SUPPORTED_DEVICES.md](./SUPPORTED_DEVICES.md). Also you can use `hidden` to hide device, product, or scene. **⚠️Overriding this property may leads to unexpected behaviors and exceptions. Please remove accessory cache after change this.**

- `options.deviceOverrides[].schema` - **optional**: An array of schema overriding config objects, used for describing datapoint(DP). When your device have non-standard DP, you need to transform them manually with config.
- `options.deviceOverrides[].schema[].oldCode` - **required**: Original DP code.
- `options.deviceOverrides[].schema[].code` - **required**: New DP code.
- `options.deviceOverrides[].schema[].type` - **optional**: New DP type. One of the `Boolean`, `Integer`, `Enum`, `String`, `Json`, `Raw`.
- `options.deviceOverrides[].schema[].property` - **optional**: New DP property object. For `Integer` type, the object should contains `min`, `max`, `scale`, `step`; For `Enum` type, the object should contains `range`. For detail information, please see `TuyaDeviceSchemaProperty` in [TuyaDevice.ts](./src/device/TuyaDevice.ts).
- `options.deviceOverrides[].schema[].onGet` - **optional**: An one-line JavaScript code convert old value to new value. The function is called with one argument: `value`.
- `options.deviceOverrides[].schema[].onSet` - **optional**: An one-line JavaScript code convert new value to old value. The function is called with one argument: `value`.

## Examples

### Hide device / scene

```js
{
  "options": {
    // ...
    "deviceOverrides": [{
      "id": "{device_id_or_scene_id}",
      "category": "hidden"
    }]
  }
}
```

### Changing DP code

```js
{
  "options": {
    // ...
    "deviceOverrides": [{
      "id": "{device_id}",
      "schema": [{
          "oldCode": "{oldCode}",
          "code": "{newCode}",
      }]
    }]
  }
}
```

### Convert from enum DP to boolean DP

A example of convert `open`/`close` into `true`/`false`.
```js
{
  "options": {
    // ...
    "deviceOverrides": [{
      "id": "{device_id}",
      "schema": [{
        "oldCode": "{oldCode}",
        "code": "{newCode}",
        "type": "Boolean",
        "onGet": "(value === 'open') ? true : false;",
        "onSet": "(value === true) ? 'open' : 'close';",
      }]
    }]
  }
}
```

### Adjust integer DP ranges

Some odd thermostat stores double of the real value to keep the decimal part (0.5°C).

We need override both range and value in order to make it working. (Only override value is not enough, range is required too.)

Here's an example of the invalid schema:
```js
{
  code: 'temp_set',
  mode: 'rw',
  type: 'Integer',
  property: { unit: '℃', min: 10, max: 70, scale: 1, step: 5 }
}
```

The value `41` actually represents for `20.5°C`, the range `10~70` actually represents for `5.0°C~35.0°C`.

To fix this, first we need set scale to `1`, and convert `41` to `205` when getting, convert `205` to `41` when getting, which means `value x 5` when getting, and `value / 5` when setting.

Here's the example config:
```js
{
  "options": {
    // ...
    "deviceOverrides": [{
      "id": "{device_id}",
      "schema": [{
        "oldCode": "temp_set",
        "code": "temp_set",
        "onGet": "(value * 5);",
        "onSet": "(value / 5);",
        "property": {
          "min": 50,
          "max": 350,
          "scale": 1,
          "step": 5,
        }
      }]
    }]
  }
}
```

After transform value using `onGet` and `onSet`, and new range in `property`, it should be working now.
