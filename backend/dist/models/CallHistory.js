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
const sequelize_typescript_1 = require("sequelize-typescript");
const User_1 = __importDefault(require("./User"));
const Whatsapp_1 = __importDefault(require("./Whatsapp"));
const Contact_1 = __importDefault(require("./Contact"));
const Company_1 = __importDefault(require("./Company"));
let CallHistory = class CallHistory extends sequelize_typescript_1.Model {
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], CallHistory.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], CallHistory.prototype, "user_id", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User_1.default),
    __metadata("design:type", User_1.default)
], CallHistory.prototype, "user", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Company_1.default),
    __metadata("design:type", Company_1.default)
], CallHistory.prototype, "company", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], CallHistory.prototype, "token_wavoip", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Whatsapp_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], CallHistory.prototype, "whatsapp_id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Contact_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], CallHistory.prototype, "contact_id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Company_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], CallHistory.prototype, "company_id", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], CallHistory.prototype, "phone_to", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], CallHistory.prototype, "name", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], CallHistory.prototype, "url", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    (0, sequelize_typescript_1.Default)(new Date()),
    sequelize_typescript_1.Column,
    __metadata("design:type", Date)
], CallHistory.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    (0, sequelize_typescript_1.Default)(new Date()),
    sequelize_typescript_1.Column,
    __metadata("design:type", Date)
], CallHistory.prototype, "updatedAt", void 0);
CallHistory = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "CallHistory",
        timestamps: false
    })
], CallHistory);
exports.default = CallHistory;
