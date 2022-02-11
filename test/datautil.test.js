const expect = require('chai').expect;
const DataUtil = require('../util/datautil')


describe('DataUtil', function () {
    it('getSubService() is not empty ', function () {
        const device = new DataUtil().getSubService([{"code":"switch"},{"code":"switch2"},{"code":"switch_led"}]);
        expect(device).to.not.be.empty;
    });
});
