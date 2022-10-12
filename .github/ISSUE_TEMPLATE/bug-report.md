---
name: Bug report
about: Create a report to help us improve
title: ''
labels: bug
assignees: ''

---

**Describe the bug**
A clear and concise description of what the bug is.

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.


**Device info (please complete the following information, which can be found in [log](https://github.com/tuya/tuya-homebridge/wiki/How-To-Get-Logs)):**
**request path = /v1.0/iot-01/associated-users/devices**

like this:
{
      "active_time": 1623229189,
      "biz_type": 18,
      "category": "cz",
      "create_time": 1560491945,
      "icon": "smart/product_icon/cz.png",
      "id": "aaaaaaaaaaa",
      "ip": "xxxxxxxxxxxxxxxx",
      "lat": "30.30286857361191",
      "local_key": "xxxxxxxxxxxxx",
      "lon": "120.0639743842656",
      "model": "",
      "name": "Living Room Socket",
      "online": false,
      "owner_id": "34794909",
      "product_id": "yfemiswbgjhddhcf",
      "product_name": "Switch Product",
      "status": [
        {
          "code": "switch",
          "value": false
        },
        {
          "code": "countdown_1",
          "value": 0
        },
        {
          "code": "cur_current",
          "value": 0
        },
        {
          "code": "cur_power",
          "value": 0
        },
        {
          "code": "cur_voltage",
          "value": 2343
        }
      ],
      "sub": false,
      "time_zone": "+08:00",
      "uid": "xxxxxxxxxxxxxxxxxxx",
      "update_time": 1625101929,
      "uuid": "xxxxxxxxxxxxxxxxxx"
    }

**Device functions (please complete the following information, which can be found in [log](https://github.com/tuya/tuya-homebridge/wiki/How-To-Get-Logs)):**
**request path = /v1.0/devices/functions**
Same **device Id**, like this:
{
    "category":"cl",
    "devices":[
        "aaaaaaaaaaa"
    ],
    "functions":[
        {
            "code":"control",
            "desc":"control",
            "name":"control",
            "type":"Enum",
            "values":"{\"range\":[\"open\",\"stop\",\"close\"]}"
        },
        {
            "code":"percent_control",
            "desc":"percent control",
            "name":"percent control",
            "type":"Integer",
            "values":"{\"unit\":\"%\",\"min\":0,\"max\":100,\"scale\":0,\"step\":1}"
        },
        {
            "code":"control_back",
            "desc":"control back",
            "name":"control back",
            "type":"Boolean",
            "values":"{}"
        }
    ],
    "product_id":"xaabybja"
}


**Additional context**
Add any other context or logs about the problem here.
