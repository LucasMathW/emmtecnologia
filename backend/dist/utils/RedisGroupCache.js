"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroupMetadataCache = exports.groupMetadataCache = exports.updateGroupMetadataCache = exports.groupMetadataQueue = exports.redisGroupCache = void 0;
const redisClient_1 = require("../libs/redisClient");
const wbot_1 = require("../libs/wbot");
const logger_1 = __importDefault(require("./logger"));
class RedisGroupCache {
    constructor() {
        this.prefix = 'group:metadata:';
        this.defaultTTL = 604800; // 7 dias em segundos
    }
    getKey(connectionId, groupJid) {
        // Formato: group:metadata:CONNECTION_ID:GROUP_JID
        return `${this.prefix}${connectionId}:${groupJid}`;
    }
    async set(connectionId, groupJid, value, ttl = this.defaultTTL) {
        try {
            const key = this.getKey(connectionId, groupJid);
            const data = {
                timestamp: Date.now(),
                data: value
            };
            await redisClient_1.redisClient.setex(key, ttl, JSON.stringify(data));
        }
        catch (error) {
            logger_1.default.error(`Erro ao salvar no cache do grupo ${groupJid}: ${error}`);
        }
    }
    async del(connectionId, groupJid) {
        try {
            const key = this.getKey(connectionId, groupJid);
            await redisClient_1.redisClient.del(key);
        }
        catch (error) {
            logger_1.default.error(`Erro ao deletar cache do grupo ${groupJid}: ${error}`);
        }
    }
    async get(connectionId, groupJid) {
        try {
            const key = this.getKey(connectionId, groupJid);
            const data = await redisClient_1.redisClient.get(key);
            if (!data)
                return null;
            return JSON.parse(data);
        }
        catch (error) {
            logger_1.default.error(`Erro ao buscar cache do grupo ${groupJid}: ${error}`);
            return null;
        }
    }
    async has(connectionId, groupJid) {
        const key = this.getKey(connectionId, groupJid);
        return (await redisClient_1.redisClient.exists(key)) === 1;
    }
    async delete(connectionId, groupJid) {
        const key = this.getKey(connectionId, groupJid);
        await redisClient_1.redisClient.del(key);
    }
    async getMemoryStats() {
        const info = await redisClient_1.redisClient.info('memory');
        return info;
    }
}
// Instância singleton do cache
exports.redisGroupCache = new RedisGroupCache();
// Classe para gerenciar a fila de atualizações de metadata
class GroupMetadataQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.delay = Math.floor(Math.random() * (10000 - 2000) + 2000); // Delay aleatório entre 2 e 10 segundos
    }
    async add(connectionId, groupJid) {
        this.queue.push({ connectionId, groupJid });
        if (!this.processing) {
            this.processQueue();
        }
    }
    async processQueue() {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }
        this.processing = true;
        const { connectionId, groupJid } = this.queue.shift();
        try {
            const wbot = await (0, wbot_1.getWbot)(connectionId);
            const meta = await wbot.groupMetadata(groupJid);
            await exports.redisGroupCache.set(connectionId, groupJid, meta);
            logger_1.default.info(`Metadata do grupo ${groupJid} atualizada com sucesso`);
        }
        catch (error) {
            logger_1.default.error(`Erro ao processar metadata do grupo ${groupJid}: ${JSON.stringify(error)}`);
        }
        // Aguarda o delay antes de processar o próximo item
        setTimeout(() => this.processQueue(), this.delay);
    }
}
// Instância singleton da fila
exports.groupMetadataQueue = new GroupMetadataQueue();
// Funções de utilidade para metadata dos grupos
const updateGroupMetadataCache = async (connectionId, groupJid) => {
    try {
        // Adiciona à fila ao invés de processar imediatamente
        await exports.groupMetadataQueue.add(connectionId, groupJid);
        // Retorna os dados do cache atual enquanto aguarda a atualização
        const cached = await exports.redisGroupCache.get(connectionId, groupJid);
        return cached?.data || null;
    }
    catch (error) {
        logger_1.default.error(`Erro ao adicionar à fila de atualização para o grupo ${groupJid}: ${error}`);
        throw error;
    }
};
exports.updateGroupMetadataCache = updateGroupMetadataCache;
exports.groupMetadataCache = {
    set: async (groupJid, connectionId, value, ttl) => {
        if (!(0, wbot_1.internalIsJidGroup)(groupJid)) {
            logger_1.default.warn(`JID não é de um grupo: ${groupJid}`);
            return null;
        }
        return await exports.redisGroupCache.set(connectionId, groupJid, value, ttl);
    },
    get: async (groupJid, connectionId) => {
        return await (0, exports.getGroupMetadataCache)(connectionId, groupJid);
    },
    has: async (groupJid, connectionId) => {
        if (!(0, wbot_1.internalIsJidGroup)(groupJid))
            return false;
        const data = await (0, exports.getGroupMetadataCache)(connectionId, groupJid);
        return data !== null;
    }
};
const getGroupMetadataCache = async (connectionId, groupJid) => {
    if (!(0, wbot_1.internalIsJidGroup)(groupJid)) {
        logger_1.default.warn(`JID não é de um grupo: ${groupJid}`);
        return null;
    }
    try {
        const cached = await exports.redisGroupCache.get(connectionId, groupJid);
        if (cached) {
            // Verifica se o cache está expirado (mais de 7 dias)
            if (Date.now() - cached.timestamp > 604800000) { // 7 dias em milissegundos
                logger_1.default.info(`Cache expirado para o grupo: ${groupJid}, atualizando...`);
                return await (0, exports.updateGroupMetadataCache)(connectionId, groupJid);
            }
            return cached.data;
        }
        return await (0, exports.updateGroupMetadataCache)(connectionId, groupJid);
    }
    catch (error) {
        logger_1.default.error(`Erro ao obter metadata do grupo ${groupJid}: ${JSON.stringify(error)}`);
        return null;
    }
};
exports.getGroupMetadataCache = getGroupMetadataCache;
