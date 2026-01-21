"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = __importDefault(require("../utils/logger"));
const redis_1 = require("../config/redis");
class RedisConnection {
    static getInstance() {
        if (!RedisConnection.instance) {
            RedisConnection.instance = new ioredis_1.default(redis_1.REDIS_URI_CONNECTION, {
                maxRetriesPerRequest: 1,
                enableReadyCheck: false,
                retryStrategy(times) {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                }
            });
            RedisConnection.instance.on('error', (error) => {
                logger_1.default.error(`[RedisConnection] Erro na conexão Redis: ${JSON.stringify(error)}`);
            });
            RedisConnection.instance.on('connect', () => {
                logger_1.default.info('Conectado ao Redis');
            });
        }
        return RedisConnection.instance;
    }
}
exports.redisClient = RedisConnection.getInstance();
