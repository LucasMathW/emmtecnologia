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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore: suppress editor diagnostic when local types for sequelize-typescript are not resolved
const sequelize_typescript_1 = require("sequelize-typescript");
const Contact_1 = __importDefault(require("./Contact"));
const Ticket_1 = __importDefault(require("./Ticket"));
const Company_1 = __importDefault(require("./Company"));
const Queue_1 = __importDefault(require("./Queue"));
const User_1 = __importDefault(require("./User"));
const Whatsapp_1 = __importDefault(require("./Whatsapp"));
let MessageApi = class MessageApi extends sequelize_typescript_1.Model {
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], MessageApi.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Company_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], MessageApi.prototype, "companyId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Ticket_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], MessageApi.prototype, "ticketId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Ticket_1.default),
    __metadata("design:type", Ticket_1.default)
], MessageApi.prototype, "ticket", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Company_1.default),
    __metadata("design:type", Company_1.default)
], MessageApi.prototype, "company", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Whatsapp_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], MessageApi.prototype, "whatsappId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Whatsapp_1.default),
    __metadata("design:type", Whatsapp_1.default)
], MessageApi.prototype, "whatsapp", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Contact_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], MessageApi.prototype, "contactId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Contact_1.default),
    __metadata("design:type", Contact_1.default)
], MessageApi.prototype, "contact", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], MessageApi.prototype, "number", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    __metadata("design:type", String)
], MessageApi.prototype, "body", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    __metadata("design:type", String)
], MessageApi.prototype, "bodyBase64", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], MessageApi.prototype, "userId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User_1.default),
    __metadata("design:type", User_1.default)
], MessageApi.prototype, "user", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Queue_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], MessageApi.prototype, "queueId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Queue_1.default),
    __metadata("design:type", Queue_1.default)
], MessageApi.prototype, "queue", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(false),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], MessageApi.prototype, "sendSignature", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(false),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], MessageApi.prototype, "closeTicket", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(false),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], MessageApi.prototype, "base64", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Date)
], MessageApi.prototype, "schedule", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(false),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], MessageApi.prototype, "isSending", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], MessageApi.prototype, "originalName", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], MessageApi.prototype, "encoding", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], MessageApi.prototype, "mimeType", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], MessageApi.prototype, "size", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], MessageApi.prototype, "destination", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], MessageApi.prototype, "filename", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], MessageApi.prototype, "path", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], MessageApi.prototype, "buffer", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], MessageApi.prototype, "mediaType", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], MessageApi.prototype, "mediaUrl", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    sequelize_typescript_1.Column,
    __metadata("design:type", Date)
], MessageApi.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    sequelize_typescript_1.Column,
    __metadata("design:type", Date)
], MessageApi.prototype, "updatedAt", void 0);
MessageApi = __decorate([
    sequelize_typescript_1.Table
], MessageApi);
exports.default = MessageApi;
