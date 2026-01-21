import { PrismaService } from '../../../@core/infra/database/prisma.service';
import { MetaService } from '../../../@core/infra/meta/meta.service';
import { RedisService } from '../../../@core/infra/redis/RedisService.service';
export declare class TemplatesWhatsappService {
    private readonly prisma;
    private readonly metaService;
    private readonly redis;
    private readonly logger;
    private readonly CACHE_TTL;
    constructor(prisma: PrismaService, metaService: MetaService, redis: RedisService);
    listTemplates(token: string): Promise<any>;
    getTemplate(token: string, templateName: string): Promise<any>;
    createTemplate(token: string, templateData: any): Promise<any>;
    deleteTemplate(token: string, templateName: string): Promise<any>;
    refreshTemplates(token: string): Promise<any>;
    private getConexaoByToken;
}
