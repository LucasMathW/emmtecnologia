import { PrismaService } from '../../../@core/infra/database/prisma.service';
import { RedisService } from '../../../@core/infra/redis/RedisService.service';
import { RabbitMQService } from '../../../@core/infra/rabbitmq/RabbitMq.service';
import { SocketService } from '../../../@core/infra/socket/socket.service';
import { MetaService } from '../../../@core/infra/meta/meta.service';
import { IWebhookWhatsApp } from './interfaces/IWebhookWhatsApp.inteface';
export declare class WebhookService {
    private readonly prisma;
    private readonly redis;
    private readonly rabbitmq;
    private readonly socket;
    private readonly metaService;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService, rabbitmq: RabbitMQService, socket: SocketService, metaService: MetaService);
    webhookCompany(companyId: number, conexaoId: number, mode: string, verify_token: string, challenge: string): Promise<number>;
    webhookCompanyConexao(companyId: number, conexaoId: number, data: IWebhookWhatsApp): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    private processMessages;
    private processIncomingMessage;
    private extractMessageContent;
    private processStatus;
}
