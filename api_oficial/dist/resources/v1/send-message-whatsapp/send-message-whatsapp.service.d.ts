import { PrismaService } from '../../../@core/infra/database/prisma.service';
import { MetaService } from '../../../@core/infra/meta/meta.service';
import { RedisService } from '../../../@core/infra/redis/RedisService.service';
import { SendMessageDto } from './dto/send-message.dto';
export declare class SendMessageWhatsappService {
    private readonly prisma;
    private readonly metaService;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, metaService: MetaService, redis: RedisService);
    sendMessage(token: string, sendMessageDto: SendMessageDto): Promise<{
        success: boolean;
        messageId: string;
        internalId: number;
    }>;
    private buildMetaPayload;
    private processMedia;
    uploadMedia(token: string, file: Express.Multer.File): Promise<{
        success: boolean;
        mediaId: string;
    }>;
    getMessageStatus(token: string, messageId: string): Promise<any>;
}
