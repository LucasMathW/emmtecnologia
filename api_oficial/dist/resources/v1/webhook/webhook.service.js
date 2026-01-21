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
var WebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../@core/infra/database/prisma.service");
const RedisService_service_1 = require("../../../@core/infra/redis/RedisService.service");
const RabbitMq_service_1 = require("../../../@core/infra/rabbitmq/RabbitMq.service");
const socket_service_1 = require("../../../@core/infra/socket/socket.service");
const meta_service_1 = require("../../../@core/infra/meta/meta.service");
let WebhookService = WebhookService_1 = class WebhookService {
    constructor(prisma, redis, rabbitmq, socket, metaService) {
        this.prisma = prisma;
        this.redis = redis;
        this.rabbitmq = rabbitmq;
        this.socket = socket;
        this.metaService = metaService;
        this.logger = new common_1.Logger(WebhookService_1.name);
    }
    async webhookCompany(companyId, conexaoId, mode, verify_token, challenge) {
        this.logger.log('Webhook validation - Company: ' + companyId + ', Conexao: ' + conexaoId);
        if (mode !== 'subscribe') {
            throw new common_1.BadRequestException('Modo de verificacao invalido');
        }
        const tokenAdmin = process.env.TOKEN_ADMIN;
        if (tokenAdmin && verify_token === tokenAdmin) {
            this.logger.log('Webhook verificado com sucesso usando TOKEN_ADMIN');
            return parseInt(challenge);
        }
        const conexao = await this.prisma.whatsappOficial.findFirst({
            where: { id: conexaoId },
        });
        if (conexao && verify_token === conexao.token_mult100) {
            this.logger.log('Webhook verificado com sucesso usando token da conexao');
            return parseInt(challenge);
        }
        this.logger.warn('Token de verificacao invalido para Company: ' + companyId + ', Conexao: ' + conexaoId);
        throw new common_1.BadRequestException('Token de verificacao invalido');
    }
    async webhookCompanyConexao(companyId, conexaoId, data) {
        this.logger.log('Webhook recebido - Company: ' + companyId + ', Conexao: ' + conexaoId);
        try {
            const conexao = await this.prisma.whatsappOficial.findFirst({
                where: { id: conexaoId },
                include: { company: true },
            });
            if (!conexao) {
                this.logger.warn('Conexao ' + conexaoId + ' nao encontrada');
                return { success: false, error: 'Conexao nao encontrada' };
            }
            for (const entry of data.entry) {
                for (const change of entry.changes) {
                    if (change.field === 'messages') {
                        await this.processMessages(conexao, change.value);
                    }
                }
            }
            return { success: true };
        }
        catch (error) {
            this.logger.error('Erro ao processar webhook: ' + error.message);
            return { success: false, error: error.message };
        }
    }
    async processMessages(conexao, value) {
        const { metadata, contacts, messages, statuses } = value;
        if (messages && messages.length > 0) {
            for (const message of messages) {
                await this.processIncomingMessage(conexao, message, contacts?.[0]);
            }
        }
        if (statuses && statuses.length > 0) {
            for (const status of statuses) {
                await this.processStatus(conexao, status);
            }
        }
    }
    async processIncomingMessage(conexao, message, contact) {
        this.logger.log('Processando mensagem ' + message.id + ' de ' + message.from);
        try {
            let mediaUrl = null;
            let mediaData = null;
            if (['image', 'audio', 'video', 'document', 'sticker'].includes(message.type)) {
                const mediaObject = message[message.type];
                if (mediaObject?.id) {
                    try {
                        mediaData = await this.metaService.downloadMedia(mediaObject.id, conexao.send_token);
                        this.logger.log('Midia baixada: ' + mediaObject.id);
                    }
                    catch (err) {
                        this.logger.warn('Falha ao baixar midia: ' + err.message);
                    }
                }
            }
            const payload = {
                event: 'message.received',
                data: {
                    conexaoId: conexao.id,
                    companyId: conexao.companyId,
                    messageId: message.id,
                    from: message.from,
                    timestamp: message.timestamp,
                    type: message.type,
                    contact: contact ? {
                        name: contact.profile?.name,
                        wa_id: contact.wa_id,
                    } : null,
                    message: this.extractMessageContent(message),
                    media: mediaData,
                    context: message.context,
                },
            };
            await this.socket.sendMessage({
                token: conexao.token_mult100,
                fromNumber: message.from,
                nameContact: contact?.profile?.name || '',
                companyId: conexao.companyId,
                message: {
                    type: message.type,
                    timestamp: parseInt(message.timestamp),
                    idMessage: message.id,
                    text: message.text?.body,
                    file: mediaData?.url,
                    mimeType: mediaData?.mime_type,
                    idFile: mediaData?.id,
                    quoteMessageId: message.context?.id,
                },
            });
            if (conexao.use_rabbitmq && conexao.rabbitmq_queue) {
                await this.rabbitmq.publish(conexao.rabbitmq_queue, JSON.stringify(payload));
            }
            try {
                await this.metaService.markAsRead(conexao.phone_number_id, message.id, conexao.send_token);
            }
            catch (err) {
                this.logger.warn('Falha ao marcar como lida: ' + err.message);
            }
            const cacheKey = 'lastmsg:' + conexao.id + ':' + message.from;
            await this.redis.set(cacheKey, JSON.stringify(payload), 3600);
        }
        catch (error) {
            this.logger.error('Erro ao processar mensagem: ' + error.message);
            throw error;
        }
    }
    extractMessageContent(message) {
        switch (message.type) {
            case 'text':
                return { text: message.text?.body };
            case 'image':
                return {
                    image: {
                        id: message.image?.id,
                        mime_type: message.image?.mime_type,
                        caption: message.image?.caption,
                    },
                };
            case 'audio':
                return {
                    audio: {
                        id: message.audio?.id,
                        mime_type: message.audio?.mime_type,
                    },
                };
            case 'video':
                return {
                    video: {
                        id: message.video?.id,
                        mime_type: message.video?.mime_type,
                        caption: message.video?.caption,
                    },
                };
            case 'document':
                return {
                    document: {
                        id: message.document?.id,
                        mime_type: message.document?.mime_type,
                        filename: message.document?.filename,
                        caption: message.document?.caption,
                    },
                };
            case 'sticker':
                return {
                    sticker: {
                        id: message.sticker?.id,
                        mime_type: message.sticker?.mime_type,
                    },
                };
            case 'location':
                return {
                    location: {
                        latitude: message.location?.latitude,
                        longitude: message.location?.longitude,
                        name: message.location?.name,
                        address: message.location?.address,
                    },
                };
            case 'contacts':
                return { contacts: message.contacts };
            case 'interactive':
                return { interactive: message.interactive };
            case 'button':
                return { button: message.button };
            case 'reaction':
                return { reaction: message.reaction };
            default:
                return { raw: message };
        }
    }
    async processStatus(conexao, status) {
        this.logger.log('Status ' + status.status + ' para mensagem ' + status.id);
        const payload = {
            event: 'message.status',
            data: {
                conexaoId: conexao.id,
                companyId: conexao.companyId,
                messageId: status.id,
                status: status.status,
                timestamp: status.timestamp,
                recipient: status.recipient_id,
                conversation: status.conversation,
                pricing: status.pricing,
                errors: status.errors,
            },
        };
        await this.socket.readMessage({
            messageId: status.id,
            companyId: conexao.companyId,
            token: conexao.token_mult100,
        });
        const statusKey = 'status:' + conexao.id + ':' + status.id;
        await this.redis.set(statusKey, status.status, 86400);
    }
};
exports.WebhookService = WebhookService;
exports.WebhookService = WebhookService = WebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        RedisService_service_1.RedisService,
        RabbitMq_service_1.RabbitMQService,
        socket_service_1.SocketService,
        meta_service_1.MetaService])
], WebhookService);
//# sourceMappingURL=webhook.service.js.map