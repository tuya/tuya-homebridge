class LogUtil {
    constructor(isDebug = false) {
        this.isDebug = isDebug;
    }

    log(str) {
        if (this.isDebug) {
            console.log(str);
        }
    }
}

module.exports = LogUtil;