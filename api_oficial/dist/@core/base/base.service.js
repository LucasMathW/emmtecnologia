"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../infra/database/prisma.service");
const app_error_1 = require("../infra/errors/app.error");
class BaseService {
    constructor(entity, name_service) {
        this.entity = entity;
        this.checkInstance();
        this.logger = new common_1.Logger(`${BaseService.name} - ${name_service}`);
    }
    checkInstance() {
        if (!this.prisma) {
            this.prisma = new prisma_service_1.PrismaService();
        }
    }
    async create(data) {
        try {
            if (!data)
                throw new Error('Data not found');
            return this.prisma[this.entity].create({ data });
        }
        catch (error) {
            this.logger.error(error.message);
            throw new app_error_1.AppError(error.message);
        }
    }
    async all() {
        try {
            return this.prisma[this.entity].findMany();
        }
        catch (error) {
            this.logger.error(error.message);
            throw new app_error_1.AppError(error.message);
        }
    }
    async one(id) {
        try {
            if (!id)
                throw new Error('Is necessary to send the id');
            return this.prisma[this.entity].findUnique({ where: { id } });
        }
        catch (error) {
            this.logger.error(error.message);
            throw new app_error_1.AppError(error.message);
        }
    }
    async findWith(operator) {
        try {
            return await this.prisma[this.entity].findMany(operator);
        }
        catch (error) {
            this.logger.error(error.message);
            throw new app_error_1.AppError(error.message);
        }
    }
    async findWithOne(operator) {
        try {
            return await this.prisma[this.entity].findFirst(operator);
        }
        catch (error) {
            this.logger.error(error.message);
            throw new app_error_1.AppError(error.message);
        }
    }
    async update(id, data) {
        try {
            if (!id)
                throw new Error('Id not found');
            if (JSON.stringify(data) === '{}')
                throw new Error('Data not found');
            return await this.prisma[this.entity].update({ where: { id }, data });
        }
        catch (error) {
            this.logger.error(error.message);
            throw new app_error_1.AppError(error.message);
        }
    }
    async delete(id) {
        try {
            if (!id)
                throw new Error('Id not found');
            return await this.prisma[this.entity].delete({ where: { id } });
        }
        catch (error) {
            this.logger.error(error.message);
            throw new app_error_1.AppError(error.message);
        }
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=base.service.js.map