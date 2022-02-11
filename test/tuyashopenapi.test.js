const expect = require('chai').expect;
const TuyaSHOpenAPI = require("../lib/tuyashopenapi");
const LogUtil = require('../util/logutil')

var api = new TuyaSHOpenAPI(
    "xxxxxxxxxxxxxxxxxx",
    "xxxxxxxxxxxxxxxxxx",
    "xxxxxxxxxxxxxxxxxx",
    "xxxxxxxxxxxxxxxxxx",
    86,
    "tuyaSmart",
    new LogUtil(
        false,
    ),
);

describe('TuyaSHOpenAPI', function () {
    it('getDevices() is not empty ', async function () {
        this.timeout(5000)
        const device = await api.getDevices();
        expect(device).to.not.be.empty;
    });
});
