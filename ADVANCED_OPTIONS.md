# Advanced Options

**During the beta version, the options are unstable, may get changed during updates.**

The main function of `deviceOverrides` is to convert "non-standard schema" to "standard schema", making device compatible with this plugin.

Before config, you may need to:
- Have basic programming skills of JavaScript (Only used in `onGet`/`onSet` handler).
- Understand the meaning of device schema (aka Data Type): [Tuya IoT Development Platform > Cloud Development > Standard Instruction Set > Data Type](https://developer.tuya.com/en/docs/iot/datatypedescription?id=K9i5ql2jo7j1k)
- Find your device product's "Standard Instruction Set" and "Standard Status Set" documentation under [Tuya IoT Development Platform > Cloud Development > Standard Instruction Set](https://developer.tuya.com/en/docs/iot/datatypedescription?id=K9i5ql6waswzq)
- Get your device's detail information from `/path/to/persist/TuyaDeviceList.xxx.json` (Full path can be found from logs).
- Find the "wrong schema", then convert to the "correct schema" from product documentation.


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
- `options.deviceOverrides[].schema[].onGet` - **optional**: An one-line JavaScript code convert old value to new value. The function is called with two arguments: `device`, `value`.
- `options.deviceOverrides[].schema[].onSet` - **optional**: An one-line JavaScript code convert new value to old value. The function is called with two arguments: `device`, `value`. return `undefined` means skip send this command.

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

### Offline as off

If you want to display off status when device is offline:
```js
{
  "options": {
    // ...
    "deviceOverrides": [{
      "id": "{device_id}",
      "schema": [{
        "oldCode": "{dp_code}",
        "code": "{dp_code}",
        "onGet": "(device.online && value)"
      }]
    }]
  }
}
```

### Change DP code

```js
{
  "options": {
    // ...
    "deviceOverrides": [{
      "id": "{device_id}",
      "schema": [{
          "oldCode": "{old_dp_code}",
          "code": "{new_dp_code}"
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
        "oldCode": "{old_dp_code}",
        "code": "{new_dp_code}",
        "type": "Boolean",
        "onGet": "(value === 'open') ? true : false;",
        "onSet": "(value === true) ? 'open' : 'close';"
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
          "step": 5
        }
      }]
    }]
  }
}
```

After transform value using `onGet` and `onSet`, and new range in `property`, it should be working now.

### Reverse curtain motor's on/off state

Most curtain motor have "reverse mode" setting in the Tuya App, if you don't have this, you can reverse `percent_control`/`position` and `percent_state` in the plugin config:

```js
{
  "options": {
    // ...
    "deviceOverrides": [{
      "id": "{device_id}",
      "schema": [{
        "oldCode": "percent_control",
        "code": "percent_control",
        "onGet": "(100 - value)",
        "onSet": "(100 - value)"
      }, {
        "oldCode": "percent_state",
        "code": "percent_state",
        "onGet": "(100 - value)",
        "onSet": "(100 - value)"
      }]
    }]
  }
}
```

### Skip send on/off command when touching brightness/speed slider

Some products (dimmer, fan) having issue when sending brightness/speed command with on/off command together. Here's an example of skip on/off command.

```js
{
  "options": {
    // ...
    "deviceOverrides": [{
      "id": "{device_id}",
      "schema": [{
        "oldCode": "switch_led",
        "code": "switch_led",
        "onSet": "(value === device.status.find(status => status.code === 'switch_led').value) ? undefined : value"
      }]
    }]
  }
}
```

### Convert Fahrenheit to Celsius

F = 1.8 * C + 32

C = (F - 32) / 1.8

```js
{
  "options": {
    // ...
    "deviceOverrides": [{
      "id": "{device_id}",
      "schema": [{
        "oldCode": "temp_current",
        "code": "temp_current",
        "onGet": "Math.round((value - 32) / 1.8);",
        "onSet": "Math.round(1.8 * value + 32);"
      }]
    }]
  }
}
```
