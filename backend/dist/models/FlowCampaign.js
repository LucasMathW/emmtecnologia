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
exports.FlowCampaignModel = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const Whatsapp_1 = __importDefault(require("./Whatsapp"));
const FlowBuilder_1 = require("./FlowBuilder");
let FlowCampaignModel = class FlowCampaignModel extends sequelize_typescript_1.Model {
    /**
     * Verifica se uma conexão específica está incluída nesta campanha
     */
    includesWhatsapp(whatsappId) {
        const ids = this.whatsappIds || [];
        return ids.includes(whatsappId);
    }
    /**
     * Verifica se uma mensagem faz match com as condições da campanha
     * E se a conexão está habilitada para esta campanha
     */
    matchesMessage(messageBody, whatsappId) {
        // Verificar se a conexão está habilitada para esta campanha
        if (!this.includesWhatsapp(whatsappId)) {
            return false;
        }
        // Validações básicas da mensagem
        if (!messageBody || typeof messageBody !== 'string') {
            return false;
        }
        const phrases = this.phrase || [];
        if (!Array.isArray(phrases) || phrases.length === 0) {
            return false;
        }
        const bodyLower = messageBody.toLowerCase().trim();
        return phrases.some((condition) => {
            if (!condition.text || typeof condition.text !== 'string') {
                return false;
            }
            const phraseLower = condition.text.toLowerCase().trim();
            if (condition.type === 'exact') {
                const match = bodyLower === phraseLower;
                if (match) {
                    console.log(`[MATCH EXATO] Campanha ${this.id} (WhatsApp ${whatsappId}): "${messageBody}" === "${condition.text}"`);
                }
                return match;
            }
            else if (condition.type === 'partial') {
                const match = bodyLower.includes(phraseLower);
                if (match) {
                    console.log(`[MATCH PARCIAL] Campanha ${this.id} (WhatsApp ${whatsappId}): "${messageBody}" contém "${condition.text}"`);
                }
                return match;
            }
            return false;
        });
    }
    /**
     * Get summary das conexões habilitadas
     */
    getWhatsappSummary() {
        const ids = this.whatsappIds || [];
        if (ids.length === 0)
            return "Nenhuma conexão selecionada";
        if (ids.length === 1)
            return `1 conexão (ID: ${ids[0]})`;
        return `${ids.length} conexões (IDs: ${ids.join(', ')})`;
    }
    // Override toJSON para incluir dados parseados
    toJSON() {
        const values = super.toJSON();
        return {
            ...values,
            phrase: this.phrase,
            whatsappIds: this.whatsappIds,
            whatsappId: this.whatsappId // Manter compatibilidade
        };
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], FlowCampaignModel.prototype, "id", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], FlowCampaignModel.prototype, "companyId", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], FlowCampaignModel.prototype, "userId", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], FlowCampaignModel.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => FlowBuilder_1.FlowBuilderModel),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], FlowCampaignModel.prototype, "flowId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.TEXT,
        get() {
            const rawValue = this.getDataValue('phrase');
            if (!rawValue)
                return [];
            try {
                const parsed = JSON.parse(rawValue);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
                return [{ text: parsed, type: 'exact' }];
            }
            catch {
                return [{ text: rawValue, type: 'exact' }];
            }
        },
        set(value) {
            if (typeof value === 'string') {
                this.setDataValue('phrase', JSON.stringify([{ text: value, type: 'exact' }]));
            }
            else if (Array.isArray(value)) {
                this.setDataValue('phrase', JSON.stringify(value));
            }
            else {
                this.setDataValue('phrase', JSON.stringify([]));
            }
        }
    }),
    __metadata("design:type", Array)
], FlowCampaignModel.prototype, "phrase", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.TEXT,
        get() {
            const rawValue = this.getDataValue('whatsappIds');
            if (!rawValue)
                return [];
            try {
                const parsed = JSON.parse(rawValue);
                return Array.isArray(parsed) ? parsed : [parsed];
            }
            catch {
                // Compatibilidade com formato antigo (número único)
                const numValue = parseInt(rawValue);
                return isNaN(numValue) ? [] : [numValue];
            }
        },
        set(value) {
            if (Array.isArray(value)) {
                this.setDataValue('whatsappIds', JSON.stringify(value));
            }
            else if (typeof value === 'number') {
                this.setDataValue('whatsappIds', JSON.stringify([value]));
            }
            else {
                this.setDataValue('whatsappIds', JSON.stringify([]));
            }
        }
    }),
    __metadata("design:type", Array)
], FlowCampaignModel.prototype, "whatsappIds", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Whatsapp_1.default),
    (0, sequelize_typescript_1.Column)({
        get() {
            const whatsappIds = this.whatsappIds;
            return whatsappIds && whatsappIds.length > 0 ? whatsappIds[0] : null;
        },
        set(value) {
            // Quando definir whatsappId único, converter para array
            if (value) {
                this.whatsappIds = [value];
            }
        }
    }),
    __metadata("design:type", Number)
], FlowCampaignModel.prototype, "whatsappId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Whatsapp_1.default),
    __metadata("design:type", Whatsapp_1.default)
], FlowCampaignModel.prototype, "whatsapp", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => FlowBuilder_1.FlowBuilderModel, 'flowId'),
    __metadata("design:type", FlowBuilder_1.FlowBuilderModel)
], FlowCampaignModel.prototype, "flow", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.BOOLEAN,
        defaultValue: true
    }),
    __metadata("design:type", Boolean)
], FlowCampaignModel.prototype, "status", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], FlowCampaignModel.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], FlowCampaignModel.prototype, "updatedAt", void 0);
FlowCampaignModel = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "FlowCampaigns"
    })
], FlowCampaignModel);
exports.FlowCampaignModel = FlowCampaignModel;
