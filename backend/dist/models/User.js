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
var User_1;
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_typescript_1 = require("sequelize-typescript");
const logger_1 = __importDefault(require("../utils/logger"));
const bcryptjs_1 = require("bcryptjs");
const Ticket_1 = __importDefault(require("./Ticket"));
const Queue_1 = __importDefault(require("./Queue"));
const UserQueue_1 = __importDefault(require("./UserQueue"));
const Company_1 = __importDefault(require("./Company"));
const QuickMessage_1 = __importDefault(require("./QuickMessage"));
const Whatsapp_1 = __importDefault(require("./Whatsapp"));
const Chatbot_1 = __importDefault(require("./Chatbot"));
const Chat_1 = __importDefault(require("./Chat"));
const ChatUser_1 = __importDefault(require("./ChatUser"));
const ContactWallet_1 = __importDefault(require("./ContactWallet"));
let User = User_1 = class User extends sequelize_typescript_1.Model {
    constructor() {
        super(...arguments);
        this.checkPassword = async (password) => {
            return (0, bcryptjs_1.compare)(password, this.getDataValue("passwordHash"));
        };
    }
    static async updateChatbotsUsersReferences(user) {
        await Chatbot_1.default.update({ optUserId: null }, { where: { optUserId: user.id } });
    }
    // @AfterCreate
    static async createInitialChat(user) {
        try {
            const chat = await Chat_1.default.create({
                title: user.name,
                isGroup: false,
                companyId: user.companyId,
                ownerId: user.id
            });
            await ChatUser_1.default.create({
                chatId: chat.id,
                userId: user.id,
                companyId: user.companyId
            });
            const admin = await User_1.findOne({
                where: {
                    companyId: user.companyId,
                    profile: "admin"
                }
            });
            if (admin) {
                await ChatUser_1.default.create({
                    chatId: chat.id,
                    userId: admin.id,
                    companyId: user.companyId
                });
            }
        }
        catch (err) {
            console.error("Error creating initial chat:", err);
        }
    }
    get isBirthdayToday() {
        if (!this.birthDate)
            return false;
        const moment = require('moment-timezone');
        const today = moment().tz("America/Sao_Paulo");
        const birthDate = moment(this.birthDate).tz("America/Sao_Paulo");
        return (today.month() === birthDate.month() &&
            today.date() === birthDate.date());
    }
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
     * Busca todos os usuários aniversariantes de hoje de uma empresa
     */
    static async getTodayBirthdays(companyId) {
        const moment = require('moment-timezone');
        const today = moment().tz("America/Sao_Paulo");
        const month = today.month() + 1;
        const day = today.date();
        logger_1.default.info(` [User.getTodayBirthdays] Buscando aniversariantes - Hoje: ${today.format('DD/MM/YYYY')}`);
        // Buscar todos os usuários com data de nascimento
        const users = await User_1.findAll({
            where: {
                companyId,
                birthDate: {
                    [require('sequelize').Op.ne]: null
                }
            },
            include: ['company']
        });
        logger_1.default.info(` [User.getTodayBirthdays] Total de usuários com birthDate: ${users.length}`);
        // Filtrar no JavaScript para evitar problemas de timezone do banco
        const birthdayUsers = users.filter(user => {
            if (!user.birthDate)
                return false;
            const birthDate = moment(user.birthDate).tz("America/Sao_Paulo");
            const birthMonth = birthDate.month() + 1;
            const birthDay = birthDate.date();
            const isToday = birthMonth === month && birthDay === day;
            if (isToday) {
                logger_1.default.info(` [User.getTodayBirthdays] Aniversariante encontrado: ${user.name} - ${birthDate.format('DD/MM/YYYY')}`);
            }
            return isToday;
        });
        logger_1.default.info(` [User.getTodayBirthdays] Aniversariantes de hoje: ${birthdayUsers.length}`);
        return birthdayUsers;
    }
};
User.hashPassword = async (instance) => {
    if (instance.password) {
        instance.passwordHash = await (0, bcryptjs_1.hash)(instance.password, 8);
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.VIRTUAL),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(0),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], User.prototype, "tokenVersion", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("admin"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "profile", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(null),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "profileImage", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATEONLY),
    __metadata("design:type", Date)
], User.prototype, "birthDate", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Whatsapp_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], User.prototype, "whatsappId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Whatsapp_1.default),
    __metadata("design:type", Whatsapp_1.default)
], User.prototype, "whatsapp", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], User.prototype, "super", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], User.prototype, "online", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Date)
], User.prototype, "lastSeen", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("00:00"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "startWork", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("23:59"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "endWork", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(""),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "color", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("disable"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "allTicket", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(false),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], User.prototype, "allowGroup", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("light"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "defaultTheme", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("closed"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "defaultMenu", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(""),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    __metadata("design:type", String)
], User.prototype, "farewellMessage", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Company_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], User.prototype, "companyId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Company_1.default),
    __metadata("design:type", Company_1.default)
], User.prototype, "company", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Ticket_1.default),
    __metadata("design:type", Array)
], User.prototype, "tickets", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsToMany)(() => Queue_1.default, () => UserQueue_1.default),
    __metadata("design:type", Array)
], User.prototype, "queues", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => QuickMessage_1.default, {
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        hooks: true
    }),
    __metadata("design:type", Array)
], User.prototype, "quickMessages", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => ContactWallet_1.default),
    __metadata("design:type", Array)
], User.prototype, "contactWallets", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("disabled"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "allHistoric", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Chatbot_1.default, {
        onUpdate: "SET NULL",
        onDelete: "SET NULL",
        hooks: true
    }),
    __metadata("design:type", Array)
], User.prototype, "chatbot", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("disabled"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "allUserChat", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("enabled"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "userClosePendingTicket", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("disabled"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "showDashboard", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(550),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], User.prototype, "defaultTicketsManagerWidth", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("disable"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "allowRealTime", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("disable"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "allowConnections", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("enabled"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "showContacts", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("disabled"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "showCampaign", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("enabled"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "showFlow", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(false),
    sequelize_typescript_1.Column,
    __metadata("design:type", Boolean)
], User.prototype, "finalizacaoComValorVendaAtiva", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("enabled"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "allowSeeMessagesInPendingTickets", void 0);
__decorate([
    sequelize_typescript_1.BeforeUpdate,
    sequelize_typescript_1.BeforeCreate,
    __metadata("design:type", Object)
], User, "hashPassword", void 0);
__decorate([
    sequelize_typescript_1.BeforeDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [User]),
    __metadata("design:returntype", Promise)
], User, "updateChatbotsUsersReferences", null);
User = User_1 = __decorate([
    sequelize_typescript_1.Table
], User);
exports.default = User;
