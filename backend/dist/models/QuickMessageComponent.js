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
const QuickMessage_1 = __importDefault(require("./QuickMessage"));
let QuickMessageComponent = class QuickMessageComponent extends sequelize_typescript_1.Model {
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], QuickMessageComponent.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => QuickMessage_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], QuickMessageComponent.prototype, "quickMessageId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => QuickMessage_1.default),
    __metadata("design:type", QuickMessage_1.default)
], QuickMessageComponent.prototype, "quickMessage", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], QuickMessageComponent.prototype, "type", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], QuickMessageComponent.prototype, "text", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], QuickMessageComponent.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], QuickMessageComponent.prototype, "updatedAt", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], QuickMessageComponent.prototype, "format", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], QuickMessageComponent.prototype, "example", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], QuickMessageComponent.prototype, "buttons", void 0);
QuickMessageComponent = __decorate([
    sequelize_typescript_1.Table
], QuickMessageComponent);
exports.default = QuickMessageComponent;
