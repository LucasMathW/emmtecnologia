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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateWhatsappOficialDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateWhatsappOficialDto {
}
exports.CreateWhatsappOficialDto = CreateWhatsappOficialDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID do número de telefone no Meta Business' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "phone_number_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID da conta WhatsApp Business (WABA)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "waba_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Token de acesso permanente do Meta' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "send_token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID do Business no Meta' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "business_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Número de telefone formatado' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "phone_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Token para integração com Mult100' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "token_mult100", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID da empresa no Mult100' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateWhatsappOficialDto.prototype, "idEmpresaMult100", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Usar RabbitMQ' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateWhatsappOficialDto.prototype, "use_rabbitmq", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Exchange do RabbitMQ' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "rabbitmq_exchange", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nome da fila RabbitMQ' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "rabbitmq_queue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Routing key do RabbitMQ' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "rabbitmq_routing_key", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL do webhook Chatwoot' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "chatwoot_webhook_url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Token auth Chatwoot' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "auth_token_chatwoot", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL do webhook N8N' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "n8n_webhook_url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Token auth N8N' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "auth_token_n8n", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL do webhook CRM' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "crm_webhook_url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Token auth CRM' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "auth_token_crm", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL do webhook Typebot' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "typebot_webhook_url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Token auth Typebot' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWhatsappOficialDto.prototype, "auth_token_typebot", void 0);
//# sourceMappingURL=create-whatsapp-oficial.dto.js.map