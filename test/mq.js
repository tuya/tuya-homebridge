const readline = require('readline');

const TuyaOpenApi = require("../lib/tuyaopenapi");
const TuyaOpenMQ = require("../lib/tuyamqttapi");
const env = require("./env");


(async () => {

  const api = new TuyaOpenApi(
    env.endpoint,
    env.accessId,
    env.accessKey,
  );

  await api.login(env.username, env.password);
  
  const mq = new TuyaOpenMQ(api);
  mq.start();

})();
