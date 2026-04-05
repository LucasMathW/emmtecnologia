import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import axios, { AxiosError } from 'axios';
import {
  IReceivedWhatsppOficial,
  IReceivedWhatsppOficialRead,
} from 'src/@core/interfaces/IWebsocket.interface';

@Injectable()
export class SocketService implements OnModuleDestroy {
  private connections: Map<number, Socket> = new Map();
  private url: string;
  private logger: Logger = new Logger(`${SocketService.name}`);

  constructor() {
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

  private async getSocket(id: number): Promise<Socket> {
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

    const newSocket = io(`${this.url}/${id}`, {
      query: {
        token: `Bearer ${process.env.TOKEN_ADMIN || ''}`,
      },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    this.setupSocketEvents(newSocket, id);
    this.connections.set(id, newSocket);

    return new Promise((resolve, reject) => {
      newSocket.once('connect', () => {
        this.logger.log(
          `Conectado ao websocket do servidor ${this.url}/${id}`,
        );
        resolve(newSocket);
      });

      newSocket.once('connect_error', (error) => {
        this.logger.error(
          `Erro de conexão para empresa ${id}: ${error.message}`,
        );
        this.connections.delete(id);
        reject(error);
      });
    });
  }

  private isHttpConnection(): boolean {
    const u = (this.url || '').toLowerCase();
    return (
      u.includes('localhost') ||
      u.includes('127.0.0.1') ||
      u.startsWith('http://')
    );
  }

  private getBaseUrl(): string {
    return (this.url || '').replace(/\/$/, '');
  }

  /**
   * Envia mensagem recebido por webhook da Meta para o Backend.
   * Tenta via Socket.io; se falhar, faz fallback via HTTP POST.
   */
  async sendMessage(data: IReceivedWhatsppOficial) {
    // Tentativa 1: via Socket.io
    try {
      this.logger.warn(
        `Obtendo/conectando ao websocket da empresa ${data.companyId}`,
      );
      const socket = await this.getSocket(data.companyId);
      this.logger.warn(
        `Enviando mensagem para o websocket para a empresa ${data.companyId}`,
      );
      socket.emit('receivedMessageWhatsAppOficial', data);
      return;
    } catch (error: any) {
      this.logger.error(
        `Falha ao obter socket ou enviar mensagem: ${error.message}`,
      );
    }

    // Tentativa 2: via HTTP POST (fallback)
    try {
      this.logger.warn(
        `[HTTP FALLBACK] Enviando mensagem via HTTP para empresa ${data.companyId}`,
      );
      const baseUrl = this.getBaseUrl();
      if (!baseUrl) {
        this.logger.error(
          '[HTTP FALLBACK] URL do backend não configurada',
        );
        return;
      }

      await axios.post(
        `${baseUrl}/whatsapp-oficial/receive`,
        {
          token: process.env.TOKEN_ADMIN || '',
          fromNumber: data.fromNumber,
          nameContact: data.nameContact,
          companyId: data.companyId,
          message: data.message,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.TOKEN_ADMIN || ''}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      this.logger.warn(
        `[HTTP FALLBACK] Mensagem enviada via HTTP para empresa ${data.companyId}`,
      );
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error(
        `[HTTP FALLBACK] Falha ao enviar via HTTP: ${axiosErr?.message || err}`,
      );
    }
  }

  /**
   * Marca mensagem como lida. Via Socket.io com fallback HTTP.
   */
  async readMessage(data: IReceivedWhatsppOficialRead) {
    // Tentativa 1: via Socket.io
    try {
      this.logger.warn(
        `Obtendo/conectando ao websocket da empresa ${data.companyId}`,
      );
      const socket = await this.getSocket(data.companyId);
      this.logger.warn(
        `Enviando 'read' para o websocket para a empresa ${data.companyId}`,
      );
      socket.emit('readMessageWhatsAppOficial', data);
      return;
    } catch (error: any) {
      this.logger.error(
        `Falha ao obter socket ou enviar 'read': ${error.message}`,
      );
    }

    // Tentativa 2: via HTTP POST (fallback)
    try {
      this.logger.warn(
        `[HTTP FALLBACK] Enviando read via HTTP para empresa ${data.companyId}`,
      );
      const baseUrl = this.getBaseUrl();
      if (!baseUrl) {
        this.logger.error(
          '[HTTP FALLBACK] URL do backend não configurada',
        );
        return;
      }

      await axios.post(
        `${baseUrl}/whatsapp-oficial/read`,
        {
          messageId: data.messageId,
          companyId: data.companyId,
          token: process.env.TOKEN_ADMIN || '',
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.TOKEN_ADMIN || ''}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      this.logger.warn(
        `[HTTP FALLBACK] Read enviado via HTTP para empresa ${data.companyId}`,
      );
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error(
        `[HTTP FALLBACK] Falha ao enviar read via HTTP: ${axiosErr?.message || err}`,
      );
    }
  }

  /**
   * Envia status update para o backend (sent, delivered, read, failed).
   */
  async sendStatusUpdate(params: {
    messageId: string;
    status: string;
    companyId: number;
  }) {
    try {
      const baseUrl = this.getBaseUrl();
      if (!baseUrl) {
        this.logger.error('[HTTP STATUS] URL do backend não configurada');
        return;
      }

      await axios.post(
        `${baseUrl}/whatsapp-oficial/status`,
        params,
        {
          headers: {
            Authorization: `Bearer ${process.env.TOKEN_ADMIN || ''}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      this.logger.log(
        `[HTTP STATUS] Status enviado: ${params.status} para mensagem ${params.messageId}`,
      );
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error(
        `[HTTP STATUS] Falha ao enviar status: ${axiosErr?.message || err}`,
      );
    }
  }

  private setupSocketEvents(socket: Socket, id: number): void {
    socket.on('disconnect', (reason) => {
      this.logger.error(
        `Desconectado do websocket (Empresa ${id}). Razão: ${reason}`,
      );
      this.connections.delete(id);
    });
  }

  async emit(event: string, data: any): Promise<void> {
    try {
      const companyId = data?.data?.companyId || data?.companyId;
      if (!companyId) {
        this.logger.warn('CompanyId não encontrado nos dados');
        return;
      }

      this.logger.log(`Emitindo evento ${event} para empresa ${companyId}`);
      const socket = await this.getSocket(companyId);
      socket.emit(event, data);
    } catch (error: any) {
      this.logger.error(`Falha ao emitir evento ${event}: ${error.message}`);
    }
  }
}
