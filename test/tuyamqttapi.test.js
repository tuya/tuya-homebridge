const expect = require('chai').expect;
const TuyaSHOpenAPI = require("../lib/tuyashopenapi");
const TuyaOpenMQ = require("../lib/tuyamqttapi");
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

var mq = new TuyaOpenMQ(api, "1.0", new LogUtil(
    false,
));


// describe('TuyaOpenMQ', function () {
//     it('MQ Connect', async function (done) {
//         this.timeout(5000);
//         await api._refreshAccessTokenIfNeed("");;
//         // done() is provided by it() to indicate asynchronous completion
//         // call done() with no parameter to indicate that it() is done() and successful
//         // or with an error to indicate that it() failed
//         // Called from the event loop, not it()
//         // So only the event loop could capture uncaught exceptions from here
//         try {
//             mq.__proto__._onConnect = () => {
//                 console.log("TuyaOpenMQ connected");
//                 expect(true).to.equal(true);
//                 done(); // success: call done with no parameter to indicate that it() is done()
//             }
//             mq.__proto__._onError = () => {
//                 console.log("TuyaOpenMQ _onError");
//                 expect(true).to.equal(true);
//                 done(); // success: call done with no parameter to indicate that it() is done()
//             }
//             mq.__proto__._onEnd = () => {
//                 console.log("TuyaOpenMQ _onEnd");
//                 expect(true).to.equal(true);
//                 done(); // success: call done with no parameter to indicate that it() is done()
//             }
//             mq.start();
//             mq.addMessageListener(() => {
//             });
//         } catch (e) {
//             done(e); // failure: call done with an error Object to indicate that it() failed
//         }
//         // returns immediately after setting timeout
//         // so it() can no longer catch exception happening asynchronously
//     });
// });


describe('TuyaOpenMQ', function () {
    it('MQ Connect', async function () {

        function start() {
            return new Promise((resolve, reject) => {
                TuyaOpenMQ.prototype._onConnect = () => {
                    console.log("MQ Connect is Success");
                    expect(true);
                    resolve()
                }
                mq.start();
            })
        }
        this.timeout(5000)

        // await api.asd('')
        await api._refreshAccessTokenIfNeed("");
        await start()

    });
});