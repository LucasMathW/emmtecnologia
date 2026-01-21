"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PrismaClienteExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClienteExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const client_1 = require("@prisma/client");
let PrismaClienteExceptionFilter = PrismaClienteExceptionFilter_1 = class PrismaClienteExceptionFilter extends core_1.BaseExceptionFilter {
    constructor() {
        super(...arguments);
        this.logger = new common_1.Logger(PrismaClienteExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const meta = exception.meta.target;
        switch (exception.code) {
            case 'P1016': {
                const status = common_1.HttpStatus.NOT_ACCEPTABLE;
                response.status(status).json({
                    status: status,
                    timestamp: new Date().toISOString(),
                    message: `The provide value for the column is too long for column's type`,
                    path: request.url,
                });
                this.logger.error(`Stack Error - ${exception.message}`);
                break;
            }
            case 'P2000': {
                const status = common_1.HttpStatus.NOT_ACCEPTABLE;
                response.status(status).json({
                    status: status,
                    timestamp: new Date().toISOString(),
                    message: `The provide value for the column is too long for column's type`,
                    path: request.url,
                });
                this.logger.error(`Stack Error - ${exception.message}`);
                break;
            }
            case 'P2001': {
                const status = common_1.HttpStatus.NOT_FOUND;
                response.status(status).json({
                    status: status,
                    timestamp: new Date().toISOString(),
                    message: `The document in condition where does not exist`,
                    path: request.url,
                });
                this.logger.error(`Stack Error - ${exception.message}`);
                break;
            }
            case 'P2002': {
                const status = common_1.HttpStatus.CONFLICT;
                response.status(status).json({
                    status: status,
                    timestamp: new Date().toISOString(),
                    message: `O registro de ${meta} é uma constante e não pode ser alterado e nem duplicado.`,
                    path: request.url,
                });
                this.logger.error(`Stack Error - ${exception.message}`);
                break;
            }
            case 'P2003': {
                const status = common_1.HttpStatus.FORBIDDEN;
                response.status(status).json({
                    status: status,
                    timestamp: new Date().toISOString(),
                    message: `Foreign key constraint failed on the field ${meta}`,
                    path: request.url,
                });
                this.logger.error(`Stack Error - ${exception.message}`);
                break;
            }
            case 'P2004': {
                const status = common_1.HttpStatus.FAILED_DEPENDENCY;
                response.status(status).json({
                    status: status,
                    timestamp: new Date().toISOString(),
                    message: `A constraint failed on the database: ${meta}`,
                    path: request.url,
                });
                this.logger.error(`Stack Error - ${exception.message}`);
                break;
            }
            case 'P2005': {
                const status = common_1.HttpStatus.NOT_ACCEPTABLE;
                response.status(status).json({
                    status: status,
                    timestamp: new Date().toISOString(),
                    message: `The value of field value is invalid for the fields type: ${meta}`,
                    path: request.url,
                });
                this.logger.error(`Stack Error - ${exception.message}`);
                break;
            }
            default:
                const status = common_1.HttpStatus.BAD_REQUEST;
                response.status(status).json({
                    status: status,
                    timestamp: new Date().toISOString(),
                    message: `Erro ao tentar ler o banco de dados`,
                    path: request.url,
                });
                this.logger.error(`Stack Error - ${exception.message}`);
                break;
        }
    }
};
exports.PrismaClienteExceptionFilter = PrismaClienteExceptionFilter;
exports.PrismaClienteExceptionFilter = PrismaClienteExceptionFilter = PrismaClienteExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(client_1.Prisma.PrismaClientKnownRequestError)
], PrismaClienteExceptionFilter);
//# sourceMappingURL=prisma.filter.js.map