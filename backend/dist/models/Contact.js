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
var Contact_1;
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Contact.ts - Versão atualizada com birthDate
const sequelize_typescript_1 = require("sequelize-typescript");
const logger_1 = __importDefault(require("../utils/logger"));
const ContactCustomField_1 = __importDefault(require("./ContactCustomField"));
const Ticket_1 = __importDefault(require("./Ticket"));
const Company_1 = __importDefault(require("./Company"));
const Schedule_1 = __importDefault(require("./Schedule"));
const ContactTag_1 = __importDefault(require("./ContactTag"));
const Tag_1 = __importDefault(require("./Tag"));
const ContactWallet_1 = __importDefault(require("./ContactWallet"));
const User_1 = __importDefault(require("./User"));
const Whatsapp_1 = __importDefault(require("./Whatsapp"));
const WhatsapplidMap_1 = __importDefault(require("./WhatsapplidMap"));
let Contact = Contact_1 = class Contact extends sequelize_typescript_1.Model {
    get urlPicture() {
        if (this.getDataValue("urlPicture")) {
            return this.getDataValue("urlPicture") === "nopicture.png"
                ? `${process.env.FRONTEND_URL}/nopicture.png`
                : `${process.env.BACKEND_URL}${process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""}/public/company${this.companyId}/contacts/${this.getDataValue("urlPicture")}`;
        }
        return null;
    }
    //  MÉTODOS PARA ANIVERSÁRIO
    // Adicionar no modelo Contact.ts - Método corrigido para buscar aniversariantes
    /**
     * Verifica se hoje é aniversário do contato
     */
    get isBirthdayToday() {
        if (!this.birthDate)
            return false;
        const moment = require('moment-timezone');
        const today = moment().tz("America/Sao_Paulo");
        const birthDate = moment(this.birthDate).tz("America/Sao_Paulo");
        return (today.month() === birthDate.month() &&
            today.date() === birthDate.date());
    }
    /**
     * Calcula a idade atual do contato
     */
    get currentAge() {
        if (!this.birthDate)
            return null;
        const moment = require('moment-timezone');
        const today = moment().tz("America/Sao_Paulo");
        const birthDate = moment(this.birthDate).tz("America/Sao_Paulo");
        let age = today.year() - birthDate.year();
        // Ajustar se ainda não fez aniversário este ano
        const monthDiff = today.month() - birthDate.month();
        if (monthDiff < 0 || (monthDiff === 0 && today.date() < birthDate.date())) {
            age--;
        }
        return age;
    }
    /**
     * Busca todos os contatos aniversariantes de hoje de uma empresa
     */
    static async getTodayBirthdays(companyId) {
        const moment = require('moment-timezone');
        const today = moment().tz("America/Sao_Paulo");
        const month = today.month() + 1;
        const day = today.date();
        logger_1.default.info(` [Contact.getTodayBirthdays] Buscando aniversariantes - Hoje: ${today.format('DD/MM/YYYY')}`);
        // Buscar todos os contatos com data de nascimento
        const contacts = await Contact_1.findAll({
            where: {
                companyId,
                active: true,
                birthDate: {
                    [require('sequelize').Op.ne]: null
                }
            },
            include: [
                'company',
                'whatsapp',
                {
                    model: ContactWallet_1.default,
                    include: [
                        {
                            model: User_1.default,
                            attributes: ['id', 'name']
                        }
                    ]
                }
            ]
        });
        logger_1.default.info(` [Contact.getTodayBirthdays] Total de contatos com birthDate: ${contacts.length}`);
        // Filtrar no JavaScript para evitar problemas de timezone do banco
        const birthdayContacts = contacts.filter(contact => {
            if (!contact.birthDate)
                return false;
            const birthDate = moment(contact.birthDate).tz("America/Sao_Paulo");
            const birthMonth = birthDate.month() + 1;
            const birthDay = birthDate.date();
            const isToday = birthMonth === month && birthDay === day;
            if (isToday) {
                logger_1.default.info(` [Contact.getTodayBirthdays] Aniversariante encontrado: ${contact.name} - ${birthDate.format('DD/MM/YYYY')}`);
            }
            return isToday;
        });
        logger_1.default.info(` [Contact.getTodayBirthdays] Aniversariantes de hoje: ${birthdayContacts.length}`);
        return birthdayContacts;
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], Contact.prototype, "id", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Contact.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    sequelize_typescript_1.Unique,
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Contact.prototype, "number", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)(""),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Contact.prototype, "email", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(""),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Contact.prototype, "profilePicUrl", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(false),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], Contact.prototype, "isGroup", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(false),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], Contact.prototype, "disableBot", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(true),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], Contact.prototype, "acceptAudioMessage", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(true),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], Contact.prototype, "active", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("whatsapp"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Contact.prototype, "channel", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATEONLY),
    __metadata("design:type", Date)
], Contact.prototype, "birthDate", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Contact.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Contact.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Ticket_1.default),
    __metadata("design:type", Array)
], Contact.prototype, "tickets", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => ContactCustomField_1.default),
    __metadata("design:type", Array)
], Contact.prototype, "extraInfo", void 0);
__decorate([
    (0, sequelize_typescript_1.HasOne)(() => WhatsapplidMap_1.default),
    __metadata("design:type", WhatsapplidMap_1.default)
], Contact.prototype, "whatsappLidMap", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => ContactTag_1.default),
    __metadata("design:type", Array)
], Contact.prototype, "contactTags", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsToMany)(() => Tag_1.default, () => ContactTag_1.default),
    __metadata("design:type", Array)
], Contact.prototype, "tags", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Company_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], Contact.prototype, "companyId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Company_1.default),
    __metadata("design:type", Company_1.default)
], Contact.prototype, "company", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Schedule_1.default, {
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        hooks: true
    }),
    __metadata("design:type", Array)
], Contact.prototype, "schedules", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Contact.prototype, "remoteJid", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], Contact.prototype, "lid", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Date)
], Contact.prototype, "lgpdAcceptedAt", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], Contact.prototype, "pictureUpdated", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], Contact.prototype, "urlPicture", null);
__decorate([
    (0, sequelize_typescript_1.BelongsToMany)(() => User_1.default, () => ContactWallet_1.default, "contactId", "walletId"),
    __metadata("design:type", Array)
], Contact.prototype, "wallets", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => ContactWallet_1.default),
    __metadata("design:type", Array)
], Contact.prototype, "contactWallets", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Whatsapp_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], Contact.prototype, "whatsappId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Whatsapp_1.default),
    __metadata("design:type", Whatsapp_1.default)
], Contact.prototype, "whatsapp", void 0);
Contact = Contact_1 = __decorate([
    sequelize_typescript_1.Table
], Contact);
exports.default = Contact;
