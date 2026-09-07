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
exports.SendMessageWhatsappController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const send_message_whatsapp_service_1 = require("./send-message-whatsapp.service");
const send_message_dto_1 = require("./dto/send-message.dto");
const auth_decorator_1 = require("../../../@core/guard/auth.decorator");
let SendMessageWhatsappController = class SendMessageWhatsappController {
    constructor(sendMessageService) {
        this.sendMessageService = sendMessageService;
    }
    async sendMessage(token, sendMessageDto) {
        return this.sendMessageService.sendMessage(token, sendMessageDto);
    }
    async uploadMedia(token, file) {
        return this.sendMessageService.uploadMedia(token, file);
    }
    async getMessageStatus(token, messageId) {
        return this.sendMessageService.getMessageStatus(token, messageId);
    }
};
exports.SendMessageWhatsappController = SendMessageWhatsappController;
__decorate([
    (0, auth_decorator_1.Public)(),
    (0, common_1.Post)(':token'),
    (0, swagger_1.ApiOperation)({ summary: 'Enviar mensagem via WhatsApp Oficial' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Mensagem enviada com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro ao enviar mensagem' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Conexão não encontrada' }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], SendMessageWhatsappController.prototype, "sendMessage", null);
__decorate([
    (0, auth_decorator_1.Public)(),
    (0, common_1.Post)(':token/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Upload de mídia para envio posterior' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Upload realizado com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro no upload' }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SendMessageWhatsappController.prototype, "uploadMedia", null);
__decorate([
    (0, auth_decorator_1.Public)(),
    (0, common_1.Get)(':token/status/:messageId'),
    (0, swagger_1.ApiOperation)({ summary: 'Consultar status de uma mensagem' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Status da mensagem' }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('messageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SendMessageWhatsappController.prototype, "getMessageStatus", null);
exports.SendMessageWhatsappController = SendMessageWhatsappController = __decorate([
    (0, common_1.Controller)('v1/send-message-whatsapp'),
    (0, swagger_1.ApiTags)('Send Message WhatsApp'),
    __metadata("design:paramtypes", [send_message_whatsapp_service_1.SendMessageWhatsappService])
], SendMessageWhatsappController);
//# sourceMappingURL=send-message-whatsapp.controller.js.map