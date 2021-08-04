class LogUtil {
    constructor(isDebug = false) {
        this.isDebug = isDebug;
    }

    log(...args) {
        if (this.isDebug) {
            console.log(...args);
        }
    }

    error(...args) {
        console.log(...args);
    }
}

module.exports = LogUtil;
