---
name: Error Code
about: Create a report to help us improve
title: ''
labels: code XXX
assignees: ''

---

**Describe the bug**
A clear and concise description of what the bug is.

**Screenshots**
If applicable, add screenshots to help explain your problem.


**Login request (please complete the following information, which can be found in [log](https://github.com/tuya/tuya-homebridge/wiki/How-To-Get-Logs)):**
**request path = /v1.0/iot-01/associated-users/actions/authorized-login**

like this:

TuyaOpenAPI request: method = post, endpoint = https://openapi.tuyacn.com, path = /v1.0/iot-01/associated-users/actions/authorized-login, params = null, body = {"country_code":86,"username":"XXXXXXXXXXXXX","password":"c44755c3379313db173e53c3e8fb6701","schema":"tuyaSmart"}, headers = {"t":"1626082406842","client_id":"XXXXXXXXXXXXX","nonce":"33341140-e2f4-11eb-abd9-491eaffd7d33","Signature-Headers":"client_id","sign":"2E250AB9256B14F6EAD94DEA9EE0EA8413E7939E7DEAB0B60D8D786B296A7AF8","sign_method":"HMAC-SHA256","access_token":"","lang":"en","dev_lang":"javascript","dev_channel":"homebridge","devVersion":"1.2.1"}

**Login response (please complete the following information, which can be found in [log](https://github.com/tuya/tuya-homebridge/wiki/How-To-Get-Logs)):**
**request path = /v1.0/devices/functions**
TuyaOpenAPI response: {"code":1106,"msg":"permission deny","success":false,"t":1626082407259} path = /v1.0/iot-01/associated-users/actions/authorized-login


