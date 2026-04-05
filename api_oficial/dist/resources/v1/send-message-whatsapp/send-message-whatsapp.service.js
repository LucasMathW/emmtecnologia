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
var SendMessageWhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendMessageWhatsappService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../@core/infra/database/prisma.service");
const meta_service_1 = require("../../../@core/infra/meta/meta.service");
const RedisService_service_1 = require("../../../@core/infra/redis/RedisService.service");
const send_message_dto_1 = require("./dto/send-message.dto");
let SendMessageWhatsappService = SendMessageWhatsappService_1 = class SendMessageWhatsappService {
    constructor(prisma, metaService, redis) {
        this.prisma = prisma;
        this.metaService = metaService;
        this.redis = redis;
        this.logger = new common_1.Logger(SendMessageWhatsappService_1.name);
    }
    async sendMessage(token, sendMessageDto) {
        this.logger.log(`Enviando mensagem para ${sendMessageDto.to}`);
        const conexao = await this.prisma.whatsappOficial.findFirst({
            where: { token_mult100: token },
            include: { company: true },
        });
        if (!conexao) {
            throw new common_1.NotFoundException('Conexão não encontrada para o token informado');
        }
        try {
            const payload = await this.buildMetaPayload(sendMessageDto, conexao);
            const result = await this.metaService.sendMessage(conexao.phone_number_id, conexao.send_token, payload);
            const savedMessage = await this.prisma.sendMessageWhatsApp.create({
                data: {
                    type: sendMessageDto.type,
                    to: sendMessageDto.to,
                    text: sendMessageDto.text ? JSON.stringify(sendMessageDto.text) : null,
                    audio: sendMessageDto.audio ? JSON.stringify(sendMessageDto.audio) : null,
                    document: sendMessageDto.document ? JSON.stringify(sendMessageDto.document) : null,
                    image: sendMessageDto.image ? JSON.stringify(sendMessageDto.image) : null,
                    video: sendMessageDto.video ? JSON.stringify(sendMessageDto.video) : null,
                    location: sendMessageDto.location ? JSON.stringify(sendMessageDto.location) : null,
                    contacts: sendMessageDto.contacts ? JSON.stringify(sendMessageDto.contacts) : null,
                    interactive: sendMessageDto.interactive ? JSON.stringify(sendMessageDto.interactive) : null,
                    template: sendMessageDto.template ? JSON.stringify(sendMessageDto.template) : null,
                    whatsappOficialId: conexao.id,
                },
            });
            await this.redis.set(`msg:${result.messages[0].id}`, JSON.stringify({
                id: savedMessage.id,
                to: sendMessageDto.to,
                type: sendMessageDto.type,
                status: 'sent',
                conexaoId: conexao.id,
            }), 86400);
            return {
                success: true,
                messageId: result.messages[0].id,
                internalId: savedMessage.id,
            };
        }
        catch (error) {
            this.logger.error(`Erro ao enviar mensagem: ${error.message}`);
            throw new common_1.BadRequestException(`Erro ao enviar mensagem: ${error.message}`);
        }
    }
    async sendMessageWithFile(token, rawData, file) {
        this.logger.log(`Enviando mensagem com arquivo para ${rawData.to}`);
        const conexao = await this.prisma.whatsappOficial.findFirst({
            where: { token_mult100: token },
            include: { company: true },
        });
        if (!conexao) {
            throw new common_1.NotFoundException('Conexão não encontrada para o token informado');
        }
        try {
            const normalized = this.normalizeBackendPayload(rawData, file);
            if (file && !normalized.image?.link && !normalized.video?.link && !normalized.audio?.id && !normalized.document?.link) {
                const uploadResult = await this.metaService.uploadMedia(conexao.phone_number_id, conexao.send_token, file);
                const mediaId = uploadResult?.id;
                if (mediaId) {
                    this.setMediaId(normalized, mediaId);
                }
            }
            const payload = await this.buildMetaPayload(normalized, conexao);
            const result = await this.metaService.sendMessage(conexao.phone_number_id, conexao.send_token, payload);
            const savedMessage = await this.prisma.sendMessageWhatsApp.create({
                data: {
                    type: normalized.type || rawData.type,
                    to: rawData.to || normalized.to,
                    text: normalized.text ? JSON.stringify(normalized.text) : null,
                    image: normalized.image ? JSON.stringify(normalized.image) : null,
                    audio: normalized.audio ? JSON.stringify(normalized.audio) : null,
                    video: normalized.video ? JSON.stringify(normalized.video) : null,
                    document: normalized.document ? JSON.stringify(normalized.document) : null,
                    template: normalized.template ? JSON.stringify(normalized.template) : null,
                    interactive: normalized.interactive ? JSON.stringify(normalized.interactive) : null,
                    contacts: normalized.contacts ? JSON.stringify(normalized.contacts) : null,
                    whatsappOficialId: conexao.id,
                },
            });
            if (result?.messages?.[0]?.id) {
                await this.redis.set(`msg:${result.messages[0].id}`, JSON.stringify({
                    id: savedMessage.id,
                    to: normalized.to,
                    type: normalized.type,
                    status: 'sent',
                    conexaoId: conexao.id,
                }), 86400);
            }
            return {
                success: true,
                messageId: result?.messages?.[0]?.id || null,
                idMessageWhatsApp: [result?.messages?.[0]?.id || null],
                internalId: savedMessage.id,
            };
        }
        catch (error) {
            this.logger.error(`Erro ao enviar mensagem com arquivo: ${error.message}`);
            throw new common_1.BadRequestException(`Erro ao enviar mensagem: ${error.message}`);
        }
    }
    normalizeBackendPayload(rawData, file) {
        const dto = {
            to: rawData.to,
            type: rawData.type,
            context: rawData.quotedId ? { message_id: rawData.quotedId } : undefined,
        };
        if (rawData.body_text) {
            dto.text = {
                body: rawData.body_text.body,
                preview_url: rawData.body_text.preview_url,
            };
        }
        if (rawData.body_image) {
            if (rawData.body_image.id || rawData.body_image.link) {
                dto.image = rawData.body_image;
            }
        }
        if (rawData.body_video) {
            if (rawData.body_video.id || rawData.body_video.link) {
                dto.video = rawData.body_video;
            }
        }
        if (rawData.body_audio) {
            if (rawData.body_audio.id || rawData.body_audio.link) {
                dto.audio = rawData.body_audio;
            }
        }
        if (rawData.body_document) {
            if (rawData.body_document.id || rawData.body_document.link) {
                dto.document = rawData.body_document;
            }
        }
        if (rawData.body_location) {
            dto.location = rawData.body_location;
        }
        if (rawData.body_contacts) {
            dto.contacts = Array.isArray(rawData.body_contacts) ? rawData.body_contacts : [rawData.body_contacts];
        }
        if (rawData.body_interactive) {
            dto.interactive = rawData.body_interactive;
        }
        if (rawData.body_template) {
            dto.template = rawData.body_template;
        }
        if (rawData.body_reaction) {
            dto.reaction = rawData.body_reaction;
        }
        return dto;
    }
    setMediaId(dto, mediaId) {
        if (dto.text || dto.image)
            dto.image = { id: mediaId };
        if (dto.video)
            dto.video = { id: mediaId };
        if (dto.audio)
            dto.audio = { id: mediaId };
        if (dto.document)
            dto.document = { id: mediaId };
    }
    async buildMetaPayload(dto, conexao) {
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: dto.to,
            type: dto.type,
        };
        if (dto.context) {
            payload.context = {
                message_id: dto.context.message_id,
            };
        }
        switch (dto.type) {
            case send_message_dto_1.MessageType.TEXT:
                payload.text = dto.text;
                break;
            case send_message_dto_1.MessageType.IMAGE:
                payload.image = await this.processMedia(dto.image, conexao);
                break;
            case send_message_dto_1.MessageType.AUDIO:
                payload.audio = await this.processMedia(dto.audio, conexao);
                break;
            case send_message_dto_1.MessageType.VIDEO:
                payload.video = await this.processMedia(dto.video, conexao);
                break;
            case send_message_dto_1.MessageType.DOCUMENT:
                payload.document = await this.processMedia(dto.document, conexao);
                break;
            case send_message_dto_1.MessageType.STICKER:
                payload.sticker = await this.processMedia(dto.sticker, conexao);
                break;
            case send_message_dto_1.MessageType.LOCATION:
                payload.location = dto.location;
                break;
            case send_message_dto_1.MessageType.CONTACTS:
                payload.contacts = dto.contacts;
                break;
            case send_message_dto_1.MessageType.INTERACTIVE:
                payload.interactive = dto.interactive;
                break;
            case send_message_dto_1.MessageType.TEMPLATE:
                payload.template = dto.template;
                break;
            case send_message_dto_1.MessageType.REACTION:
                payload.reaction = dto.reaction;
                break;
            default:
                throw new common_1.BadRequestException(`Tipo de mensagem não suportado: ${dto.type}`);
        }
        return payload;
    }
    async processMedia(media, conexao) {
        if (!media)
            return null;
        if (media.id) {
            const result = { id: media.id };
            if (media.caption)
                result.caption = media.caption;
            if (media.filename)
                result.filename = media.filename;
            return result;
        }
        if (media.link) {
            const result = { link: media.link };
            if (media.caption)
                result.caption = media.caption;
            if (media.filename)
                result.filename = media.filename;
            return result;
        }
        throw new common_1.BadRequestException('Mídia deve ter id ou link');
    }
    async uploadMedia(token, file) {
        this.logger.log(`Upload de mídia: ${file.originalname}`);
        const conexao = await this.prisma.whatsappOficial.findFirst({
            where: { token_mult100: token },
        });
        if (!conexao) {
            throw new common_1.NotFoundException('Conexão não encontrada');
        }
        try {
            const result = await this.metaService.uploadMedia(conexao.phone_number_id, conexao.send_token, file);
            return {
                success: true,
                mediaId: result.id,
            };
        }
        catch (error) {
            this.logger.error(`Erro no upload: ${error.message}`);
            throw new common_1.BadRequestException(`Erro no upload: ${error.message}`);
        }
    }
    async getMessageStatus(token, messageId) {
        const cached = await this.redis.get(`msg:${messageId}`);
        if (cached) {
            return JSON.parse(cached);
        }
        const conexao = await this.prisma.whatsappOficial.findFirst({
            where: { token_mult100: token },
        });
        if (!conexao) {
            throw new common_1.NotFoundException('Conexão não encontrada');
        }
        const status = await this.redis.get(`status:${conexao.id}:${messageId}`);
        return {
            messageId,
            status: status || 'unknown',
        };
    }
};
exports.SendMessageWhatsappService = SendMessageWhatsappService;
exports.SendMessageWhatsappService = SendMessageWhatsappService = SendMessageWhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        meta_service_1.MetaService,
        RedisService_service_1.RedisService])
], SendMessageWhatsappService);
//# sourceMappingURL=send-message-whatsapp.service.js.map