"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validarFields = validarFields;
exports.dynamicSort = dynamicSort;
function validarFields(fields, obj) {
    return fields.reduce((acc, cur) => {
        if (obj[`${cur}`] instanceof Object) {
            if (obj[`${cur}`] == null) {
                acc.push(cur);
            }
        }
        else {
            if (obj[`${cur}`] == null || obj[`${cur}`] == undefined) {
                acc.push(cur);
            }
        }
        return acc;
    }, []);
}
function dynamicSort(property) {
    let sortOrder = 1;
    if (property[0] === '-') {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a, b) {
        const result = a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
        return result * sortOrder;
    };
}
//# sourceMappingURL=array.util.js.map