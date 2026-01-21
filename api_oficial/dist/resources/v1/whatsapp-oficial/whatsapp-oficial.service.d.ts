import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateWhatsappOficialDto } from './dto/create-whatsapp-oficial.dto';
import { UpdateWhatsappOficialDto } from './dto/update-whatsapp-oficial.dto';
import { BaseService } from 'src/@core/base/base.service';
import { WhatsAppOficial } from 'src/@core/domain/entities/whatsappOficial.model';
export declare class WhatsappOficialService extends BaseService<WhatsAppOficial> {
    private readonly configService;
    logger: Logger;
    private readonly apiUrl;
    constructor(configService: ConfigService);
    private generateWebhookUrl;
    private addWebhookUrl;
    oneWhatAppOficial(id: number): Promise<any>;
    allWhatsAppOficial(): Promise<any[]>;
    createWhatsAppOficial(data: CreateWhatsappOficialDto): Promise<any>;
    updateWhatsAppOficial(id: number, data: UpdateWhatsappOficialDto): Promise<any>;
    deleteWhatsAppOficial(id: number): Promise<WhatsAppOficial>;
}
