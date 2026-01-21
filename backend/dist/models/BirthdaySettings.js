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
var BirthdaySettings_1;
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/BirthdaySettings.ts
const sequelize_typescript_1 = require("sequelize-typescript");
const Company_1 = __importDefault(require("./Company"));
let BirthdaySettings = BirthdaySettings_1 = class BirthdaySettings extends sequelize_typescript_1.Model {
    // Método para obter configurações com fallback para valores padrão
    static async getCompanySettings(companyId) {
        let settings = await BirthdaySettings_1.findOne({
            where: { companyId }
        });
        if (!settings) {
            settings = await BirthdaySettings_1.create({
                companyId,
                userBirthdayEnabled: true,
                contactBirthdayEnabled: true,
                userBirthdayMessage: '🎉 Parabéns, {nome}! Hoje é seu dia especial! Desejamos muito sucesso e felicidade! ',
                contactBirthdayMessage: '🎉 Parabéns, {nome}! Hoje é seu aniversário! Desejamos muito sucesso, saúde e felicidade! ✨',
                sendBirthdayTime: '09:00:00',
                createAnnouncementForUsers: true,
                whatsappId: null
            });
        }
        return settings;
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], BirthdaySettings.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Company_1.default),
    sequelize_typescript_1.Unique,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], BirthdaySettings.prototype, "companyId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Company_1.default),
    __metadata("design:type", Company_1.default)
], BirthdaySettings.prototype, "company", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(true),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], BirthdaySettings.prototype, "userBirthdayEnabled", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(true),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], BirthdaySettings.prototype, "contactBirthdayEnabled", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)('🎉 Parabéns, {nome}! Hoje é seu dia especial! Desejamos muito sucesso e felicidade! '),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    __metadata("design:type", String)
], BirthdaySettings.prototype, "userBirthdayMessage", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)('🎉 Parabéns, {nome}! Hoje é seu aniversário! Desejamos muito sucesso, saúde e felicidade! ✨'),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    __metadata("design:type", String)
], BirthdaySettings.prototype, "contactBirthdayMessage", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)('09:00:00'),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TIME),
    __metadata("design:type", String)
], BirthdaySettings.prototype, "sendBirthdayTime", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(true),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], BirthdaySettings.prototype, "createAnnouncementForUsers", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], BirthdaySettings.prototype, "whatsappId", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], BirthdaySettings.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], BirthdaySettings.prototype, "updatedAt", void 0);
BirthdaySettings = BirthdaySettings_1 = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'BirthdaySettings',
        modelName: 'BirthdaySettings'
    })
], BirthdaySettings);
exports.default = BirthdaySettings;
