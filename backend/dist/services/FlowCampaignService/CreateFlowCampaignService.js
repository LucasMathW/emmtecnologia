"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FlowBuilder_1 = require("../../models/FlowBuilder");
const FlowCampaign_1 = require("../../models/FlowCampaign");
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const CreateFlowCampaignService = async ({ userId, name, companyId, phrases, whatsappIds, flowId, status }) => {
    try {
        // Validações básicas
        if (!name?.trim()) {
            throw new AppError_1.default("Nome da campanha é obrigatório", 400);
        }
        if (!flowId || isNaN(Number(flowId))) {
            throw new AppError_1.default("Fluxo é obrigatório e deve ser um ID válido", 400);
        }
        if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
            throw new AppError_1.default("Pelo menos uma frase é obrigatória", 400);
        }
        // NOVA VALIDAÇÃO: Verificar whatsappIds
        if (!whatsappIds || !Array.isArray(whatsappIds) || whatsappIds.length === 0) {
            throw new AppError_1.default("Pelo menos uma conexão WhatsApp deve ser selecionada", 400);
        }
        // Validar se todas as frases têm conteúdo
        const validPhrases = phrases.filter(phrase => phrase.text?.trim());
        if (validPhrases.length === 0) {
            throw new AppError_1.default("Pelo menos uma frase deve ter conteúdo", 400);
        }
        // Verificar se o fluxo existe
        const flowExists = await FlowBuilder_1.FlowBuilderModel.findOne({
            where: {
                id: Number(flowId),
                company_id: companyId
            }
        });
        if (!flowExists) {
            throw new AppError_1.default("Fluxo não encontrado", 404);
        }
        // NOVA VALIDAÇÃO: Verificar se todas as conexões existem e pertencem à empresa
        const whatsappConnections = await Whatsapp_1.default.findAll({
            where: {
                id: whatsappIds,
                companyId: companyId
            }
        });
        if (whatsappConnections.length !== whatsappIds.length) {
            const foundIds = whatsappConnections.map(w => w.id);
            const missingIds = whatsappIds.filter(id => !foundIds.includes(id));
            throw new AppError_1.default(`Conexões não encontradas ou não pertencem à empresa: ${missingIds.join(', ')}`, 400);
        }
        // Verificar se já existe campanha com o mesmo nome
        const existingCampaign = await FlowCampaign_1.FlowCampaignModel.findOne({
            where: {
                name: name.trim(),
                companyId
            }
        });
        if (existingCampaign) {
            throw new AppError_1.default("Já existe uma campanha com este nome", 400);
        }
        // Normalizar e validar frases
        const normalizedPhrases = validPhrases.map(phrase => ({
            text: phrase.text.trim(),
            type: phrase.type || 'exact'
        }));
        // Criar a campanha
        const flow = await FlowCampaign_1.FlowCampaignModel.create({
            userId,
            companyId,
            name: name.trim(),
            phrase: normalizedPhrases,
            flowId: Number(flowId),
            whatsappIds: whatsappIds,
            status: status
        });
        // Recarregar para obter dados completos com associações
        await flow.reload({
            include: [
                {
                    model: FlowBuilder_1.FlowBuilderModel,
                    as: 'flow',
                    attributes: ['id', 'name']
                }
            ]
        });
        console.log(`✅ Campanha criada: ${flow.name} com ${whatsappIds.length} conexões: ${whatsappIds.join(', ')}`);
        return flow;
    }
    catch (error) {
        console.error("Erro ao criar campanha de fluxo:", error);
        if (error instanceof AppError_1.default) {
            throw error;
        }
        if (error.name === 'SequelizeValidationError') {
            const messages = error.errors.map(err => err.message).join(', ');
            throw new AppError_1.default(`Erro de validação: ${messages}`, 400);
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw new AppError_1.default("Já existe uma campanha com estes dados", 400);
        }
        throw new AppError_1.default("Erro interno ao criar campanha", 500);
    }
};
exports.default = CreateFlowCampaignService;
