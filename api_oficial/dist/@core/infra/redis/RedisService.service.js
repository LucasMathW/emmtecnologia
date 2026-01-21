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
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let RedisService = class RedisService {
    constructor() {
        this.logger = new common_1.Logger('RedisServer');
        this.logger.log('🔄 Iniciando conexão com Redis...');
        try {
            this.client = new ioredis_1.Redis(process.env.REDIS_URI);
            this.logger.log(`📡 Conexão com Redis estabelecida com sucesso`);
        }
        catch (error) {
            this.logger.error(`❌ Erro ao conectar com Redis: ${error}`);
        }
    }
    async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
            await this.client.set(key, value, 'EX', ttlSeconds);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async get(key) {
        return await this.client.get(key);
    }
    async del(key) {
        return await this.client.del(key);
    }
    async keys(pattern) {
        return await this.client.keys(pattern);
    }
    async exists(key) {
        const result = await this.client.exists(key);
        return result === 1;
    }
    async expire(key, ttlSeconds) {
        await this.client.expire(key, ttlSeconds);
    }
    async ttl(key) {
        return await this.client.ttl(key);
    }
    async quit() {
        try {
            await this.client.quit();
            this.logger.log('👋 Conexão com Redis encerrada com sucesso');
        }
        catch (error) {
            this.logger.error(`❌ Erro ao encerrar conexão com Redis: ${error}`);
        }
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RedisService);
//# sourceMappingURL=RedisService.service.js.map