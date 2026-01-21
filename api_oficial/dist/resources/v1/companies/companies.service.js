"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CompaniesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompaniesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../@core/infra/database/prisma.service");
const app_error_1 = require("../../../@core/infra/errors/app.error");
let CompaniesService = CompaniesService_1 = class CompaniesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(`${CompaniesService_1.name}`);
    }
    async one(id) {
        try {
            if (!id)
                throw new Error('Necessário informar o id');
            const company = await this.prisma.company.findUnique({ where: { id } });
            if (!company)
                throw new Error('Empresa não encontrada');
            return company;
        }
        catch (error) {
            this.logger.error(`one - ${error.message}`);
            throw new app_error_1.AppError(error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async all() {
        try {
            return await this.prisma.company.findMany();
        }
        catch (error) {
            this.logger.error(`all - ${error.message}`);
            throw new app_error_1.AppError(error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async create(dto) {
        try {
            const findedCompany = await this.prisma.company.findUnique({
                where: { idEmpresaMult100: dto.idEmpresaMult100 },
            });
            if (!!findedCompany)
                throw new Error('Já existe uma empresa com este id cadastrada');
            return await this.prisma.company.create({
                data: { name: dto.name, idEmpresaMult100: dto.idEmpresaMult100 },
            });
        }
        catch (error) {
            this.logger.error(`create - ${error.message}`);
            throw new app_error_1.AppError(error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async update(id, dto) {
        try {
            const company = await this.prisma.company.findUnique({ where: { id } });
            if (!!company)
                throw new Error('Empresa não encontrada');
            return await this.prisma.company.update({
                where: { id },
                data: { name: dto.name },
            });
        }
        catch (error) {
            this.logger.error(`update - ${error.message}`);
            throw new app_error_1.AppError(error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = CompaniesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompaniesService);
//# sourceMappingURL=companies.service.js.map