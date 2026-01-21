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
const Announcement_1 = __importDefault(require("./Announcement"));
const Company_1 = __importDefault(require("./Company"));
let AnnouncementAck = class AnnouncementAck extends sequelize_typescript_1.Model {
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], AnnouncementAck.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Announcement_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], AnnouncementAck.prototype, "announcementId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Company_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], AnnouncementAck.prototype, "companyId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Announcement_1.default),
    __metadata("design:type", Announcement_1.default)
], AnnouncementAck.prototype, "announcement", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Company_1.default),
    __metadata("design:type", Company_1.default)
], AnnouncementAck.prototype, "company", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], AnnouncementAck.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], AnnouncementAck.prototype, "updatedAt", void 0);
AnnouncementAck = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "AnnouncementAcks"
    })
], AnnouncementAck);
exports.default = AnnouncementAck;
