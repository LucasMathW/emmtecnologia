"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SocketService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const common_1 = require("@nestjs/common");
const socket_io_client_1 = require("socket.io-client");
let SocketService = SocketService_1 = class SocketService {
    constructor() {
        this.connections = new Map();
        this.logger = new common_1.Logger(`${SocketService_1.name}`);
        this.url = process.env.URL_BACKEND_MULT100;
        if (!this.url) {
            this.logger.error('Nenhuma configuração do url do backend');
        }
    }
    onModuleDestroy() {
        this.logger.log('Desconectando todos os sockets...');
        this.connections.forEach((socket, id) => {
            this.logger.log(`Desconectando socket da empresa ${id}`);
            socket.disconnect();
        });
        this.connections.clear();
    }
    async getSocket(id) {
        if (this.connections.has(id)) {
            const existingSocket = this.connections.get(id);
            if (existingSocket.connected) {
                return existingSocket;
            }
            existingSocket.disconnect();
            this.connections.delete(id);
        }
        if (!this.url) {
            throw new Error('URL do backend não configurada');
        }
        const newSocket = (0, socket_io_client_1.io)(`${this.url}/${id}`, {
            query: {
                token: `Bearer ${process.env.TOKEN_ADMIN || ''}`,
            },
            reconnection: true,
            transports: ['websocket', 'polling'],
        });
        this.setupSocketEvents(newSocket, id);
        this.connections.set(id, newSocket);
        return new Promise((resolve, reject) => {
            newSocket.on('connect', () => {
                this.logger.log(`Conectado ao websocket do servidor ${this.url}/${id}`);
                resolve(newSocket);
            });
            newSocket.on('connect_error', (error) => {
                this.logger.error(`Erro de conexão para empresa ${id}: ${error.message}`);
                this.connections.delete(id);
                reject(error);
            });
        });
    }
    async sendMessage(data) {
        try {
            this.logger.warn(`Obtendo/conectando ao websocket da empresa ${data.companyId}`);
            const socket = await this.getSocket(data.companyId);
            this.logger.warn(`Enviando mensagem para o websocket para a empresa ${data.companyId}`);
            socket.emit('receivedMessageWhatsAppOficial', data);
        }
        catch (error) {
            this.logger.error(`Falha ao obter socket ou enviar mensagem: ${error.message}`);
        }
    }
    async readMessage(data) {
        try {
            this.logger.warn(`Obtendo/conectando ao websocket da empresa ${data.companyId}`);
            const socket = await this.getSocket(data.companyId);
            this.logger.warn(`Enviando 'read' para o websocket para a empresa ${data.companyId}`);
            socket.emit('readMessageWhatsAppOficial', data);
        }
        catch (error) {
            this.logger.error(`Falha ao obter socket ou enviar 'read': ${error.message}`);
        }
    }
    setupSocketEvents(socket, id) {
        socket.on('disconnect', (reason) => {
            this.logger.error(`Desconectado do websocket (Empresa ${id}). Razão: ${reason}`);
            this.connections.delete(id);
        });
    }
    async emit(event, data) {
        try {
            const companyId = data?.data?.companyId || data?.companyId;
            if (!companyId) {
                this.logger.warn('CompanyId não encontrado nos dados');
                return;
            }
            this.logger.log(`Emitindo evento ${event} para empresa ${companyId}`);
            const socket = await this.getSocket(companyId);
            socket.emit(event, data);
        }
        catch (error) {
            this.logger.error(`Falha ao emitir evento ${event}: ${error.message}`);
        }
    }
};
exports.SocketService = SocketService;
exports.SocketService = SocketService = SocketService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SocketService);
//# sourceMappingURL=socket.service.js.map