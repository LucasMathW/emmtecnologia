"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    constructor(message, code = 400) {
        super(message);
        this.message = message;
        this.code = code;
    }
}
exports.AppError = AppError;
//# sourceMappingURL=app.error.js.map