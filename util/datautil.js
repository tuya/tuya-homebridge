class DataUtil {
    constructor() {}
    
    getSubService(status) {
        var subTypeArr = []
        for (var map of status) {
            if (map.code.indexOf("switch") != -1) {
                if (typeof map.value === 'boolean') {
                    subTypeArr.push(map.code)
                } 
            }
        }
        return {
            subType: subTypeArr,
        };
    }
}

module.exports = DataUtil;