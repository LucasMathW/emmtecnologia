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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendMessageDto = exports.ContextDto = exports.ReactionMessageDto = exports.TemplateMessageDto = exports.TemplateComponentDto = exports.InteractiveMessageDto = exports.InteractiveActionDto = exports.InteractiveButtonDto = exports.ContactDto = exports.ContactPhoneDto = exports.ContactNameDto = exports.LocationMessageDto = exports.MediaMessageDto = exports.TextMessageDto = exports.MessageType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "text";
    MessageType["IMAGE"] = "image";
    MessageType["AUDIO"] = "audio";
    MessageType["VIDEO"] = "video";
    MessageType["DOCUMENT"] = "document";
    MessageType["STICKER"] = "sticker";
    MessageType["LOCATION"] = "location";
    MessageType["CONTACTS"] = "contacts";
    MessageType["INTERACTIVE"] = "interactive";
    MessageType["TEMPLATE"] = "template";
    MessageType["REACTION"] = "reaction";
})(MessageType || (exports.MessageType = MessageType = {}));
class TextMessageDto {
}
exports.TextMessageDto = TextMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Corpo da mensagem de texto' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TextMessageDto.prototype, "body", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Preview de links' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], TextMessageDto.prototype, "preview_url", void 0);
class MediaMessageDto {
}
exports.MediaMessageDto = MediaMessageDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID da mídia no Meta' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], MediaMessageDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL da mídia' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], MediaMessageDto.prototype, "link", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Legenda' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], MediaMessageDto.prototype, "caption", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nome do arquivo (para documentos)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], MediaMessageDto.prototype, "filename", void 0);
class LocationMessageDto {
}
exports.LocationMessageDto = LocationMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Latitude' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LocationMessageDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Longitude' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LocationMessageDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Nome do local' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LocationMessageDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Endereço' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LocationMessageDto.prototype, "address", void 0);
class ContactNameDto {
}
exports.ContactNameDto = ContactNameDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nome formatado' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ContactNameDto.prototype, "formatted_name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContactNameDto.prototype, "first_name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContactNameDto.prototype, "last_name", void 0);
class ContactPhoneDto {
}
exports.ContactPhoneDto = ContactPhoneDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ContactPhoneDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContactPhoneDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContactPhoneDto.prototype, "wa_id", void 0);
class ContactDto {
}
exports.ContactDto = ContactDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: ContactNameDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ContactNameDto),
    __metadata("design:type", ContactNameDto)
], ContactDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [ContactPhoneDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ContactPhoneDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], ContactDto.prototype, "phones", void 0);
class InteractiveButtonDto {
}
exports.InteractiveButtonDto = InteractiveButtonDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InteractiveButtonDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InteractiveButtonDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InteractiveButtonDto.prototype, "title", void 0);
class InteractiveActionDto {
}
exports.InteractiveActionDto = InteractiveActionDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [InteractiveButtonDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => InteractiveButtonDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], InteractiveActionDto.prototype, "buttons", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], InteractiveActionDto.prototype, "button", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], InteractiveActionDto.prototype, "sections", void 0);
class InteractiveMessageDto {
}
exports.InteractiveMessageDto = InteractiveMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['button', 'list', 'product', 'product_list'] }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InteractiveMessageDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], InteractiveMessageDto.prototype, "header", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], InteractiveMessageDto.prototype, "body", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], InteractiveMessageDto.prototype, "footer", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: InteractiveActionDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => InteractiveActionDto),
    __metadata("design:type", InteractiveActionDto)
], InteractiveMessageDto.prototype, "action", void 0);
class TemplateComponentDto {
}
exports.TemplateComponentDto = TemplateComponentDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TemplateComponentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], TemplateComponentDto.prototype, "parameters", void 0);
class TemplateMessageDto {
}
exports.TemplateMessageDto = TemplateMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nome do template' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TemplateMessageDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Código do idioma' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], TemplateMessageDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [TemplateComponentDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => TemplateComponentDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], TemplateMessageDto.prototype, "components", void 0);
class ReactionMessageDto {
}
exports.ReactionMessageDto = ReactionMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID da mensagem para reagir' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReactionMessageDto.prototype, "message_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Emoji da reação (vazio para remover)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReactionMessageDto.prototype, "emoji", void 0);
class ContextDto {
}
exports.ContextDto = ContextDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID da mensagem para responder' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ContextDto.prototype, "message_id", void 0);
class SendMessageDto {
}
exports.SendMessageDto = SendMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Número do destinatário (com código do país)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "to", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: MessageType, description: 'Tipo da mensagem' }),
    (0, class_validator_1.IsEnum)(MessageType),
    __metadata("design:type", String)
], SendMessageDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: TextMessageDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => TextMessageDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", TextMessageDto)
], SendMessageDto.prototype, "text", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: MediaMessageDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => MediaMessageDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", MediaMessageDto)
], SendMessageDto.prototype, "image", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: MediaMessageDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => MediaMessageDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", MediaMessageDto)
], SendMessageDto.prototype, "audio", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: MediaMessageDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => MediaMessageDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", MediaMessageDto)
], SendMessageDto.prototype, "video", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: MediaMessageDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => MediaMessageDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", MediaMessageDto)
], SendMessageDto.prototype, "document", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: MediaMessageDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => MediaMessageDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", MediaMessageDto)
], SendMessageDto.prototype, "sticker", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: LocationMessageDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LocationMessageDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", LocationMessageDto)
], SendMessageDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [ContactDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ContactDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], SendMessageDto.prototype, "contacts", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: InteractiveMessageDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => InteractiveMessageDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", InteractiveMessageDto)
], SendMessageDto.prototype, "interactive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: TemplateMessageDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => TemplateMessageDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", TemplateMessageDto)
], SendMessageDto.prototype, "template", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: ReactionMessageDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ReactionMessageDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", ReactionMessageDto)
], SendMessageDto.prototype, "reaction", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: ContextDto, description: 'Contexto para responder mensagem' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ContextDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", ContextDto)
], SendMessageDto.prototype, "context", void 0);
//# sourceMappingURL=send-message.dto.js.map