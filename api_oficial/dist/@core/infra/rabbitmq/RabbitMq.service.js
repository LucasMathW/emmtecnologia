"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQService = void 0;
const common_1 = require("@nestjs/common");
const amqplib = require("amqplib");
class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.logger = new common_1.Logger(`${RabbitMQService.name}`);
        this.isEnabled = process.env.RABBITMQ_ENABLED_GLOBAL === 'true';
        if (this.isEnabled) {
            this.logger.log('🐰 RabbitMQ está ativado globalmente');
            this.connect();
        }
        else {
            this.logger.warn('⚠️  RabbitMQ está desativado globalmente');
        }
    }
    async connect() {
        try {
            if (!this.isEnabled)
                return;
            this.url = process.env.RABBITMQ_URL;
            this.connection = await amqplib.connect(this.url);
            this.channel = await this.connection.createChannel();
            this.logger.log('📡 Conexão com RabbitMQ estabelecida com sucesso');
        }
        catch (error) {
            this.logger.error(`❌ Erro ao conectar com RabbitMQ: ${error}`);
            console.log(error);
        }
    }
    async publish(queue, message) {
        if (!this.isEnabled || !this.channel)
            return;
        await this.channel.assertQueue(queue, { durable: true });
        this.channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
    }
    async consume(queue, callback) {
        if (!this.isEnabled || !this.channel)
            return;
        await this.channel.assertQueue(queue, { durable: true });
        await this.channel.consume(queue, (msg) => {
            if (msg !== null) {
                callback(msg.content.toString());
                this.channel?.ack(msg);
            }
        });
    }
    async sendToRabbitMQ(whats, body) {
        try {
            if (!this.isEnabled || !this.channel)
                return;
            if (!whats)
                throw new Error('Nenhum valor informado');
            if (!whats.use_rabbitmq)
                throw new Error('Configuração não ativa');
            const exchange = whats.rabbitmq_exchange;
            const queue = whats.rabbitmq_queue;
            const routingKey = whats.rabbitmq_routing_key || '';
            this.logger.log(`Declarando exchange '${exchange}' do tipo 'topic' para a empresa ${whats.companyId}...`);
            await this.channel.assertExchange(exchange, 'topic', { durable: true });
            this.logger.log(`Declarando fila '${queue}' do tipo 'quorum' para a empresa ${whats.companyId}...`);
            await this.channel.assertQueue(queue, {
                durable: true,
                arguments: { 'x-queue-type': 'quorum' },
            });
            this.logger.log(`Vinculando fila '${queue}' à exchange '${exchange}' com routing key '${routingKey}' para a empresa ${whats.companyId}...`);
            await this.channel.bindQueue(queue, exchange, routingKey);
            this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(body)), { deliveryMode: 1 });
            this.logger.log(`Mensagem enviada para o RabbitMQ para a empresa ${whats.companyId}`, { body });
            this.close();
        }
        catch (error) {
            this.logger.error(`Erro ao enviar para o RabbitMQ para a empresa ${whats.companyId}`, { error: error.message });
            throw new Error(`Erro ao enviar para o RabbitMQ para a empresa ${whats.companyId}`);
        }
    }
    async close() {
        if (!this.isEnabled)
            return;
        if (this.channel)
            await this.channel.close();
        if (this.connection)
            await this.connection.close();
    }
}
exports.RabbitMQService = RabbitMQService;
//# sourceMappingURL=RabbitMq.service.js.map