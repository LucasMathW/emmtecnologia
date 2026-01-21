"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FromDTOtoEntity = FromDTOtoEntity;
function FromDTOtoEntity(dto, entity) {
    const dtoEntries = Object.entries(dto);
    for (const [key, value] of dtoEntries) {
        if (entity.hasOwnProperty(key)) {
            entity[key] = value;
        }
    }
    for (const [key, value] of Object.entries(entity)) {
        if (!value)
            delete entity[key];
    }
    return entity;
}
//# sourceMappingURL=fromDTOtoEntity.util.js.map