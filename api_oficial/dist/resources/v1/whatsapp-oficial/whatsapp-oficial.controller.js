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
exports.WhatsappOficialController = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_oficial_service_1 = require("./whatsapp-oficial.service");
const create_whatsapp_oficial_dto_1 = require("./dto/create-whatsapp-oficial.dto");
const update_whatsapp_oficial_dto_1 = require("./dto/update-whatsapp-oficial.dto");
const swagger_1 = require("@nestjs/swagger");
let WhatsappOficialController = class WhatsappOficialController {
    constructor(whatsappOficialService) {
        this.whatsappOficialService = whatsappOficialService;
    }
    getOne(id) {
        return this.whatsappOficialService.oneWhatAppOficial(id);
    }
    getMore() {
        return this.whatsappOficialService.allWhatsAppOficial();
    }
    create(data) {
        return this.whatsappOficialService.createWhatsAppOficial(data);
    }
    update(id, data) {
        return this.whatsappOficialService.updateWhatsAppOficial(id, data);
    }
    delete(id) {
        return this.whatsappOficialService.deleteWhatsAppOficial(id);
    }
};
exports.WhatsappOficialController = WhatsappOficialController;
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Retorna um Whatsapp Oficial' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro ao retornar conexão' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Retorna o registro' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], WhatsappOficialController.prototype, "getOne", null);
__decorate([
    (0, common_1.Get)(''),
    (0, swagger_1.ApiOperation)({ summary: 'Retorna registros Whatsapp Oficial' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro ao encontrar conexões' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Retorna os registros' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WhatsappOficialController.prototype, "getMore", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Criar Whatsapp Oficial' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro ao criar conexão' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Retorna o registro criado' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_whatsapp_oficial_dto_1.CreateWhatsappOficialDto]),
    __metadata("design:returntype", void 0)
], WhatsappOficialController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar Whatsapp Oficial' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro ao atualizar conexão' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Retorna o registro atualizado' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_whatsapp_oficial_dto_1.UpdateWhatsappOficialDto]),
    __metadata("design:returntype", void 0)
], WhatsappOficialController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Deletar Whatsapp Oficial' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro ao deletar conexão' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Retorna o registro deletado' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], WhatsappOficialController.prototype, "delete", null);
exports.WhatsappOficialController = WhatsappOficialController = __decorate([
    (0, common_1.Controller)('v1/whatsapp-oficial'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('Whatsapp Oficial'),
    __metadata("design:paramtypes", [whatsapp_oficial_service_1.WhatsappOficialService])
], WhatsappOficialController);
//# sourceMappingURL=whatsapp-oficial.controller.js.map