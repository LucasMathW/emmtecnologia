import { SendMessageWhatsappService } from './send-message-whatsapp.service';
import { SendMessageDto } from './dto/send-message.dto';
export declare class SendMessageWhatsappController {
    private readonly sendMessageService;
    constructor(sendMessageService: SendMessageWhatsappService);
    sendMessage(token: string, sendMessageDto: SendMessageDto): Promise<{
        success: boolean;
        messageId: string;
        internalId: number;
    }>;
    uploadMedia(token: string, file: Express.Multer.File): Promise<{
        success: boolean;
        mediaId: string;
    }>;
    getMessageStatus(token: string, messageId: string): Promise<any>;
}
