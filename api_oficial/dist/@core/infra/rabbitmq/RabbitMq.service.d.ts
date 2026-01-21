import { WhatsAppOficial } from 'src/@core/domain/entities/whatsappOficial.model';
export declare class RabbitMQService {
    private connection;
    private channel;
    private url;
    private logger;
    private isEnabled;
    constructor();
    connect(): Promise<void>;
    publish(queue: string, message: string): Promise<void>;
    consume(queue: string, callback: (message: string) => void): Promise<void>;
    sendToRabbitMQ(whats: WhatsAppOficial, body: any): Promise<void>;
    close(): Promise<void>;
}
