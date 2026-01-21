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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompaniesController = void 0;
const common_1 = require("@nestjs/common");
const companies_service_1 = require("./companies.service");
const create_company_dto_1 = require("./dto/create-company.dto");
const update_company_dto_1 = require("./dto/update-company.dto");
const swagger_1 = require("@nestjs/swagger");
let CompaniesController = class CompaniesController {
    constructor(service) {
        this.service = service;
    }
    async one(id) {
        return await this.service.one(id);
    }
    async all() {
        return await this.service.all();
    }
    async create(body) {
        return await this.service.create(body);
    }
    async atualizar(id, body) {
        return await this.service.update(id, body);
    }
};
exports.CompaniesController = CompaniesController;
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar Empresa' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro ao listar empresa' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Mostrar dados da empresa' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "one", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar Empresas' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro ao listar empresas' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Mostrar dados das empresas' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "all", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Criar Empresa' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro ao criar empresa' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Criar empresa' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_company_dto_1.CreateCompanyDto]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar Empresa' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro ao atualizar a empresa' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Atualizar a empresa' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_company_dto_1.UpdateCompanyDto]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "atualizar", null);
exports.CompaniesController = CompaniesController = __decorate([
    (0, common_1.Controller)('v1/companies'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('Empresas'),
    __metadata("design:paramtypes", [companies_service_1.CompaniesService])
], CompaniesController);
//# sourceMappingURL=companies.controller.js.map