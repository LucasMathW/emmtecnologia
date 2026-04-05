import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../@core/infra/database/prisma.service';
import { MetaService } from '../../../@core/infra/meta/meta.service';
import { RedisService } from '../../../@core/infra/redis/RedisService.service';
import { SendMessageDto, MessageType } from './dto/send-message.dto';

@Injectable()
export class SendMessageWhatsappService {
  private readonly logger = new Logger(SendMessageWhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaService: MetaService,
    private readonly redis: RedisService,
  ) {}

  async sendMessage(token: string, sendMessageDto: SendMessageDto) {
    this.logger.log(`Enviando mensagem para ${sendMessageDto.to}`);

    // Buscar conexão pelo token
    const conexao = await this.prisma.whatsappOficial.findFirst({
      where: { token_mult100: token },
      include: { company: true },
    });

    if (!conexao) {
      throw new NotFoundException('Conexão não encontrada para o token informado');
    }

    try {
      // Montar payload para Meta API
      const payload = await this.buildMetaPayload(sendMessageDto, conexao);

      // Enviar via Meta API
      const result = await this.metaService.sendMessage(
        conexao.phone_number_id,
        conexao.send_token,
        payload,
      );

      // Salvar no banco de dados
      const savedMessage = await this.prisma.sendMessageWhatsApp.create({
        data: {
          type: sendMessageDto.type,
          to: sendMessageDto.to,
          text: sendMessageDto.text ? JSON.stringify(sendMessageDto.text) : null,
          audio: sendMessageDto.audio ? JSON.stringify(sendMessageDto.audio) : null,
          document: sendMessageDto.document ? JSON.stringify(sendMessageDto.document) : null,
          image: sendMessageDto.image ? JSON.stringify(sendMessageDto.image) : null,
          video: sendMessageDto.video ? JSON.stringify(sendMessageDto.video) : null,
          location: sendMessageDto.location ? JSON.stringify(sendMessageDto.location) : null,
          contacts: sendMessageDto.contacts ? JSON.stringify(sendMessageDto.contacts) : null,
          interactive: sendMessageDto.interactive ? JSON.stringify(sendMessageDto.interactive) : null,
          template: sendMessageDto.template ? JSON.stringify(sendMessageDto.template) : null,
          whatsappOficialId: conexao.id,
        },
      });

      // Cache do status
      await this.redis.set(
        `msg:${result.messages[0].id}`,
        JSON.stringify({
          id: savedMessage.id,
          to: sendMessageDto.to,
          type: sendMessageDto.type,
          status: 'sent',
          conexaoId: conexao.id,
        }),
        86400,
      );

      return {
        success: true,
        messageId: result.messages[0].id,
        internalId: savedMessage.id,
      };
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem: ${error.message}`);
      throw new BadRequestException(`Erro ao enviar mensagem: ${error.message}`);
    }
  }

  async sendMessageWithFile(
    token: string,
    rawData: any,
    file?: Express.Multer.File,
  ) {
    this.logger.log(`Enviando mensagem com arquivo para ${rawData.to}`);

    const conexao = await this.prisma.whatsappOficial.findFirst({
      where: { token_mult100: token },
      include: { company: true },
    });

    if (!conexao) {
      throw new NotFoundException('Conexão não encontrada para o token informado');
    }

    try {
      // Normalizar campos do backend (body_text -> text, body_image -> image, etc.)
      const normalized = this.normalizeBackendPayload(rawData, file);

      // Upload do arquivo para Meta se necessário
      if (file && !normalized.image?.link && !normalized.video?.link && !normalized.audio?.id && !normalized.document?.link) {
        const uploadResult = await this.metaService.uploadMedia(
          conexao.phone_number_id,
          conexao.send_token,
          file,
        );
        const mediaId = uploadResult?.id;
        if (mediaId) {
          this.setMediaId(normalized, mediaId);
        }
      }

      const payload = await this.buildMetaPayload(normalized, conexao);

      const result = await this.metaService.sendMessage(
        conexao.phone_number_id,
        conexao.send_token,
        payload,
      );

      const savedMessage = await this.prisma.sendMessageWhatsApp.create({
        data: {
          type: normalized.type || rawData.type,
          to: rawData.to || normalized.to,
          text: normalized.text ? JSON.stringify(normalized.text) : null,
          image: normalized.image ? JSON.stringify(normalized.image) : null,
          audio: normalized.audio ? JSON.stringify(normalized.audio) : null,
          video: normalized.video ? JSON.stringify(normalized.video) : null,
          document: normalized.document ? JSON.stringify(normalized.document) : null,
          template: normalized.template ? JSON.stringify(normalized.template) : null,
          interactive: normalized.interactive ? JSON.stringify(normalized.interactive) : null,
          contacts: normalized.contacts ? JSON.stringify(normalized.contacts) : null,
          whatsappOficialId: conexao.id,
        },
      });

      if (result?.messages?.[0]?.id) {
        await this.redis.set(
          `msg:${result.messages[0].id}`,
          JSON.stringify({
            id: savedMessage.id,
            to: normalized.to,
            type: normalized.type,
            status: 'sent',
            conexaoId: conexao.id,
          }),
          86400,
        );
      }

      return {
        success: true,
        messageId: result?.messages?.[0]?.id || null,
        idMessageWhatsApp: [result?.messages?.[0]?.id || null],
        internalId: savedMessage.id,
      };
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem com arquivo: ${error.message}`);
      throw new BadRequestException(`Erro ao enviar mensagem: ${error.message}`);
    }
  }

  /**
   * Converte o payload do formato do backend para o formato interno.
   * Backend envia: body_text, body_image, body_document, body_video, body_audio, etc.
   * API Oficial usa: text, image, document, video, audio, etc.
   */
  private normalizeBackendPayload(rawData: any, file?: Express.Multer.File): SendMessageDto {
    const dto: any = {
      to: rawData.to,
      type: rawData.type,
      context: rawData.quotedId ? { message_id: rawData.quotedId } : undefined,
    };

    if (rawData.body_text) {
      dto.text = {
        body: rawData.body_text.body,
        preview_url: rawData.body_text.preview_url,
      };
    }
    if (rawData.body_image) {
      if (rawData.body_image.id || rawData.body_image.link) {
        dto.image = rawData.body_image;
      }
    }
    if (rawData.body_video) {
      if (rawData.body_video.id || rawData.body_video.link) {
        dto.video = rawData.body_video;
      }
    }
    if (rawData.body_audio) {
      if (rawData.body_audio.id || rawData.body_audio.link) {
        dto.audio = rawData.body_audio;
      }
    }
    if (rawData.body_document) {
      if (rawData.body_document.id || rawData.body_document.link) {
        dto.document = rawData.body_document;
      }
    }
    if (rawData.body_location) {
      dto.location = rawData.body_location;
    }
    if (rawData.body_contacts) {
      dto.contacts = Array.isArray(rawData.body_contacts) ? rawData.body_contacts : [rawData.body_contacts];
    }
    if (rawData.body_interactive) {
      dto.interactive = rawData.body_interactive;
    }
    if (rawData.body_template) {
      dto.template = rawData.body_template;
    }
    if (rawData.body_reaction) {
      dto.reaction = rawData.body_reaction;
    }

    return dto as SendMessageDto;
  }

  private setMediaId(dto: any, mediaId: string) {
    if (dto.text || dto.image) dto.image = { id: mediaId };
    if (dto.video) dto.video = { id: mediaId };
    if (dto.audio) dto.audio = { id: mediaId };
    if (dto.document) dto.document = { id: mediaId };
  }

  private async buildMetaPayload(dto: SendMessageDto, conexao: any): Promise<any> {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: dto.to,
      type: dto.type,
    };

    if (dto.context) {
      payload.context = {
        message_id: dto.context.message_id,
      };
    }

    switch (dto.type) {
      case MessageType.TEXT:
        payload.text = dto.text;
        break;

      case MessageType.IMAGE:
        payload.image = await this.processMedia(dto.image, conexao);
        break;

      case MessageType.AUDIO:
        payload.audio = await this.processMedia(dto.audio, conexao);
        break;

      case MessageType.VIDEO:
        payload.video = await this.processMedia(dto.video, conexao);
        break;

      case MessageType.DOCUMENT:
        payload.document = await this.processMedia(dto.document, conexao);
        break;

      case MessageType.STICKER:
        payload.sticker = await this.processMedia(dto.sticker, conexao);
        break;

      case MessageType.LOCATION:
        payload.location = dto.location;
        break;

      case MessageType.CONTACTS:
        payload.contacts = dto.contacts;
        break;

      case MessageType.INTERACTIVE:
        payload.interactive = dto.interactive;
        break;

      case MessageType.TEMPLATE:
        payload.template = dto.template;
        break;

      case MessageType.REACTION:
        payload.reaction = dto.reaction;
        break;

      default:
        throw new BadRequestException(`Tipo de mensagem não suportado: ${dto.type}`);
    }

    return payload;
  }

  private async processMedia(media: any, conexao: any): Promise<any> {
    if (!media) return null;

    if (media.id) {
      const result: any = { id: media.id };
      if (media.caption) result.caption = media.caption;
      if (media.filename) result.filename = media.filename;
      return result;
    }

    if (media.link) {
      const result: any = { link: media.link };
      if (media.caption) result.caption = media.caption;
      if (media.filename) result.filename = media.filename;
      return result;
    }

    throw new BadRequestException('Mídia deve ter id ou link');
  }

  async uploadMedia(token: string, file: Express.Multer.File) {
    this.logger.log(`Upload de mídia: ${file.originalname}`);

    const conexao = await this.prisma.whatsappOficial.findFirst({
      where: { token_mult100: token },
    });

    if (!conexao) {
      throw new NotFoundException('Conexão não encontrada');
    }

    try {
      const result = await this.metaService.uploadMedia(
        conexao.phone_number_id,
        conexao.send_token,
        file,
      );

      return {
        success: true,
        mediaId: result.id,
      };
    } catch (error) {
      this.logger.error(`Erro no upload: ${error.message}`);
      throw new BadRequestException(`Erro no upload: ${error.message}`);
    }
  }

  async getMessageStatus(token: string, messageId: string) {
    const cached = await this.redis.get(`msg:${messageId}`);

    if (cached) {
      return JSON.parse(cached);
    }

    const conexao = await this.prisma.whatsappOficial.findFirst({
      where: { token_mult100: token },
    });

    if (!conexao) {
      throw new NotFoundException('Conexão não encontrada');
    }

    const status = await this.redis.get(`status:${conexao.id}:${messageId}`);

    return {
      messageId,
      status: status || 'unknown',
    };
  }
}
