"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPasswordTransform = void 0;
const bcrypt = require("bcrypt");
exports.hashPasswordTransform = {
    async to(password, salt) {
        return bcrypt.hash(password, salt);
    },
    async compare(password, hash) {
        return await bcrypt.compare(password, hash);
    },
    async salt() {
        return bcrypt.genSaltSync();
    },
};
//# sourceMappingURL=crypto.util.js.map