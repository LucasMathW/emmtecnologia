"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ErrorExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const library_1 = require("@prisma/client/runtime/library");
let ErrorExceptionFilter = ErrorExceptionFilter_1 = class ErrorExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(ErrorExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = exception?.code ?? common_1.HttpStatus.BAD_REQUEST;
        const payload = {
            status: status,
            timestamp: new Date().toISOString(),
            message: exception.message,
            path: request.url,
        };
        if (exception instanceof library_1.PrismaClientUnknownRequestError) {
            this.logger.error(`Stack Error - ${exception.message}`);
            payload.message = `Erro desconhecido do Banco de Dados.`;
        }
        if (exception instanceof common_1.HttpException) {
            const error = exception.getResponse();
            payload.message = error.message;
            status = exception.getStatus();
        }
        response.status(status).send(payload);
    }
};
exports.ErrorExceptionFilter = ErrorExceptionFilter;
exports.ErrorExceptionFilter = ErrorExceptionFilter = ErrorExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(Error)
], ErrorExceptionFilter);
//# sourceMappingURL=error-exception.filter.js.map