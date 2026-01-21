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
var TemplatesWhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplatesWhatsappService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../@core/infra/database/prisma.service");
const meta_service_1 = require("../../../@core/infra/meta/meta.service");
const RedisService_service_1 = require("../../../@core/infra/redis/RedisService.service");
let TemplatesWhatsappService = TemplatesWhatsappService_1 = class TemplatesWhatsappService {
    constructor(prisma, metaService, redis) {
        this.prisma = prisma;
        this.metaService = metaService;
        this.redis = redis;
        this.logger = new common_1.Logger(TemplatesWhatsappService_1.name);
        this.CACHE_TTL = 3600;
    }
    async listTemplates(token) {
        this.logger.log('Listando templates');
        const conexao = await this.getConexaoByToken(token);
        const cacheKey = `templates:${conexao.waba_id}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            this.logger.log('Templates retornados do cache');
            return JSON.parse(cached);
        }
        try {
            const templates = await this.metaService.getTemplates(conexao.waba_id, conexao.send_token);
            await this.redis.set(cacheKey, JSON.stringify(templates), this.CACHE_TTL);
            return templates;
        }
        catch (error) {
            this.logger.error(`Erro ao listar templates: ${error.message}`);
            throw new common_1.BadRequestException(`Erro ao listar templates: ${error.message}`);
        }
    }
    async getTemplate(token, templateName) {
        this.logger.log(`Buscando template: ${templateName}`);
        const conexao = await this.getConexaoByToken(token);
        try {
            const templates = await this.listTemplates(token);
            const template = templates.data?.find((t) => t.name === templateName);
            if (!template) {
                throw new common_1.NotFoundException(`Template '${templateName}' não encontrado`);
            }
            return template;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error(`Erro ao buscar template: ${error.message}`);
            throw new common_1.BadRequestException(`Erro ao buscar template: ${error.message}`);
        }
    }
    async createTemplate(token, templateData) {
        this.logger.log(`Criando template: ${templateData.name}`);
        const conexao = await this.getConexaoByToken(token);
        try {
            const result = await this.metaService.createTemplate(conexao.waba_id, conexao.send_token, templateData);
            await this.redis.del(`templates:${conexao.waba_id}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Erro ao criar template: ${error.message}`);
            throw new common_1.BadRequestException(`Erro ao criar template: ${error.message}`);
        }
    }
    async deleteTemplate(token, templateName) {
        this.logger.log(`Deletando template: ${templateName}`);
        const conexao = await this.getConexaoByToken(token);
        try {
            const result = await this.metaService.deleteTemplate(conexao.waba_id, conexao.send_token, templateName);
            await this.redis.del(`templates:${conexao.waba_id}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Erro ao deletar template: ${error.message}`);
            throw new common_1.BadRequestException(`Erro ao deletar template: ${error.message}`);
        }
    }
    async refreshTemplates(token) {
        this.logger.log('Atualizando cache de templates');
        const conexao = await this.getConexaoByToken(token);
        await this.redis.del(`templates:${conexao.waba_id}`);
        return this.listTemplates(token);
    }
    async getConexaoByToken(token) {
        const conexao = await this.prisma.whatsappOficial.findFirst({
            where: { token_mult100: token },
        });
        if (!conexao) {
            throw new common_1.NotFoundException('Conexão não encontrada para o token informado');
        }
        return conexao;
    }
};
exports.TemplatesWhatsappService = TemplatesWhatsappService;
exports.TemplatesWhatsappService = TemplatesWhatsappService = TemplatesWhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        meta_service_1.MetaService,
        RedisService_service_1.RedisService])
], TemplatesWhatsappService);
//# sourceMappingURL=templates-whatsapp.service.js.map