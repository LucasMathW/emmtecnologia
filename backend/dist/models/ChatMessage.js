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
var ChatMessage_1;
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_typescript_1 = require("sequelize-typescript");
const User_1 = __importDefault(require("./User"));
const Chat_1 = __importDefault(require("./Chat"));
const Company_1 = __importDefault(require("./Company"));
let ChatMessage = ChatMessage_1 = class ChatMessage extends sequelize_typescript_1.Model {
    get mediaPath() {
        if (this.getDataValue("mediaPath")) {
            return `${process.env.BACKEND_URL}/public/company${this.companyId}/chat/${this.getDataValue("mediaPath")}`;
        }
        return null;
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], ChatMessage.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Company_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], ChatMessage.prototype, "companyId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Chat_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], ChatMessage.prototype, "chatId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], ChatMessage.prototype, "senderId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ defaultValue: "" }),
    __metadata("design:type", String)
], ChatMessage.prototype, "message", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], ChatMessage.prototype, "mediaPath", null);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], ChatMessage.prototype, "mediaType", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], ChatMessage.prototype, "mediaName", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], ChatMessage.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], ChatMessage.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Chat_1.default),
    __metadata("design:type", Chat_1.default)
], ChatMessage.prototype, "chat", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User_1.default),
    __metadata("design:type", User_1.default)
], ChatMessage.prototype, "sender", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => ChatMessage_1),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], ChatMessage.prototype, "replyToId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => ChatMessage_1, { as: "replyTo", foreignKey: "replyToId" }),
    __metadata("design:type", ChatMessage)
], ChatMessage.prototype, "replyTo", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(false),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], ChatMessage.prototype, "isEdited", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(false),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], ChatMessage.prototype, "isDeleted", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => ChatMessage_1),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], ChatMessage.prototype, "forwardedFromId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => ChatMessage_1, {
        as: "forwardedFrom",
        foreignKey: "forwardedFromId"
    }),
    __metadata("design:type", ChatMessage)
], ChatMessage.prototype, "forwardedFrom", void 0);
ChatMessage = ChatMessage_1 = __decorate([
    (0, sequelize_typescript_1.Table)({ tableName: "ChatMessages" })
], ChatMessage);
exports.default = ChatMessage;
