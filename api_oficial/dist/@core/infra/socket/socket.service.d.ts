import { OnModuleDestroy } from '@nestjs/common';
import { IReceivedWhatsppOficial, IReceivedWhatsppOficialRead } from 'src/@core/interfaces/IWebsocket.interface';
export declare class SocketService implements OnModuleDestroy {
    private connections;
    private url;
    private logger;
    constructor();
    onModuleDestroy(): void;
    private getSocket;
    sendMessage(data: IReceivedWhatsppOficial): Promise<void>;
    readMessage(data: IReceivedWhatsppOficialRead): Promise<void>;
    private setupSocketEvents;
    emit(event: string, data: any): Promise<void>;
}
