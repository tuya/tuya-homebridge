class DataUtil {
    constructor() {}
    
    getSubService(status) {
        var subTypeArr = []
        for (var map of status) {
            if (map.code.indexOf("switch") != -1) {
                subTypeArr.push(map.code)
            }
        }
        return {
            subType: subTypeArr,
        };
    }
}

module.exports = DataUtil;