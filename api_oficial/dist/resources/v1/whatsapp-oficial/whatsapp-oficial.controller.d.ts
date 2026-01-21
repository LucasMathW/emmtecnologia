import { WhatsappOficialService } from './whatsapp-oficial.service';
import { CreateWhatsappOficialDto } from './dto/create-whatsapp-oficial.dto';
import { UpdateWhatsappOficialDto } from './dto/update-whatsapp-oficial.dto';
export declare class WhatsappOficialController {
    private readonly whatsappOficialService;
    constructor(whatsappOficialService: WhatsappOficialService);
    getOne(id: number): Promise<any>;
    getMore(): Promise<any[]>;
    create(data: CreateWhatsappOficialDto): Promise<any>;
    update(id: number, data: UpdateWhatsappOficialDto): Promise<any>;
    delete(id: number): Promise<import("../../../@core/domain/entities/whatsappOficial.model").WhatsAppOficial>;
}
