# Advanced Options

**During the beta version, the options are unstable, may get changed during updates.**

- `options.deviceOverrides` - **optional**: An array of device overriding config objects.
- `options.deviceOverrides[].id` - **required**: Device ID, Product ID, Scene ID, or `global`.
<!--
- `options.deviceOverrides[].accessoryCategory` - **optional**: Accessory Category ID. Overriding this property can change accessory's icon. See: [Homebridge Plugin Documentation > Categories](https://developers.homebridge.io/#/categories)
-->
- `options.deviceOverrides[].category` - **optional**: Device category code. See [SUPPORTED_DEVICES.md](./SUPPORTED_DEVICES.md). Also you can use `hidden` to hide device, product, or scene. **⚠️Overriding this property may leads to unexpected behaviors and exceptions. Please remove accessory cache after change this.**

- `options.deviceOverrides[].schema` - **optional**: An array of schema overriding config objects. When your device have non-standard schemas, this is used for transform them.
- `options.deviceOverrides[].schema[].oldCode` - **required**: Original Schema code.
- `options.deviceOverrides[].schema[].code` - **required**: New Schema code.
- `options.deviceOverrides[].schema[].type` - **optional**: New schema type. One of the `Boolean`, `Integer`, `Enum`, `String`, `Json`, `Raw`.
- `options.deviceOverrides[].schema[].property` - **optional**: New schema property object. For `Integer` type, the object should contains `min`, `max`, `scale`, `step`; For `Enum` type, the object should contains `range`. For detail information, please see `TuyaDeviceSchemaProperty` in [TuyaDevice.ts](./src/device/TuyaDevice.ts).
- `options.deviceOverrides[].schema[].onGet` - **optional**: An one-line JavaScript code convert old value to new value. The function is called with one argument: `value`.
- `options.deviceOverrides[].schema[].onSet` - **optional**: An one-line JavaScript code convert new value to old value. The function is called with one argument: `value`.

## Examples

### Hide device

```js
{
  "options": {
    // ...
    "deviceOverrides": [{
      "id": "{device_id}",
      "category": "hidden"
    }]
  }
}
```

### Changing schema code

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

### Convert from enum schema to boolean schema

If you want to convert a enum schema as a switch, you can do it like this:

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

### Adjust integer schema ranges

Some odd thermostat stores double of the real value to keep the decimal part (0.5°C).

For example: `40` means `20.0°C`, `41` means `20.5°C`. (storeValue = realValue x 2)

But actually, schema already support storing decimal value by setting the `scale` to `1`. The `min`, `max`, `step`, `value` should always be divided by `10^scale`. When `scale = 1`, means they should be divided by `10`.

After transform the value using `onGet` and `onSet`, the `property` should be changed to fit the new ranges.

```js
{
  "options": {
    // ...
    "deviceOverrides": [{
      "id": "{device_id}",
      "schema": [{
        "oldCode": "{oldCode}",
        "code": "{newCode}",
        "onGet": "(value * 5);",
        "onSet": "(value / 5);",
        "property": {
          "min": 200,
          "max": 500,
          "scale": 1,
          "step": 5,
        }
      }]
    }]
  }
}
```

Or if you are not familiar with `scale`, just simply ignore the decimal part is also okay.

```js
{
  "options": {
    // ...
    "deviceOverrides": [{
      "id": "{device_id}",
      "schema": [{
        "oldCode": "{oldCode}",
        "code": "{newCode}",
        "onGet": "Math.round(value / 2);",
        "onSet": "(value * 2);",
        "property": {
          "min": 20,
          "max": 50,
          "scale": 0,
          "step": 1,
        }
      }]
    }]
  }
}
```
