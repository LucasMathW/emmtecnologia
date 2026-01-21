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
exports.WebhookController = void 0;
const common_1 = require("@nestjs/common");
const webhook_service_1 = require("./webhook.service");
const swagger_1 = require("@nestjs/swagger");
const auth_decorator_1 = require("../../../@core/guard/auth.decorator");
let WebhookController = class WebhookController {
    constructor(webhookService) {
        this.webhookService = webhookService;
    }
    async webhookCompanyConexao(companyId, conexaoId, data) {
        return await this.webhookService.webhookCompanyConexao(companyId, conexaoId, data);
    }
    async webhookCompany(companyId, conexaoId, mode, verify_token, challenge) {
        return await this.webhookService.webhookCompany(companyId, conexaoId, mode, verify_token, challenge);
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, auth_decorator_1.Public)(),
    (0, common_1.Post)(':companyId/:conexaoId'),
    (0, swagger_1.ApiOperation)({ summary: 'Webhook para evento de empresa e conexão' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Retorna o erro' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Retorna true caso sucesso' }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('conexaoId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "webhookCompanyConexao", null);
__decorate([
    (0, auth_decorator_1.Public)(),
    (0, common_1.Get)(':companyId/:conexaoId'),
    (0, swagger_1.ApiOperation)({ summary: 'Webhook para validação' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Retorna o erro' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Retorna challenge' }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('conexaoId')),
    __param(2, (0, common_1.Query)('hub.mode')),
    __param(3, (0, common_1.Query)('hub.verify_token')),
    __param(4, (0, common_1.Query)('hub.challenge')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "webhookCompany", null);
exports.WebhookController = WebhookController = __decorate([
    (0, common_1.Controller)('v1/webhook'),
    (0, swagger_1.ApiTags)('Webhook'),
    __metadata("design:paramtypes", [webhook_service_1.WebhookService])
], WebhookController);
//# sourceMappingURL=webhook.controller.js.map