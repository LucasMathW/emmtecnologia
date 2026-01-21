"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFlowCampaign = exports.updateFlowCampaign = exports.flowCampaign = exports.flowCampaigns = exports.createFlowCampaign = void 0;
const CreateFlowCampaignService_1 = __importDefault(require("../services/FlowCampaignService/CreateFlowCampaignService"));
const FlowsCampaignGetDataService_1 = __importDefault(require("../services/FlowCampaignService/FlowsCampaignGetDataService"));
const GetFlowsCampaignDataService_1 = __importDefault(require("../services/FlowCampaignService/GetFlowsCampaignDataService"));
const DeleteFlowCampaignService_1 = __importDefault(require("../services/FlowCampaignService/DeleteFlowCampaignService"));
const UpdateFlowCampaignService_1 = __importDefault(require("../services/FlowCampaignService/UpdateFlowCampaignService"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const createFlowCampaign = async (req, res) => {
    try {
        const { name, flowId, phrases, whatsappIds, status } = req.body;
        const userId = parseInt(req.user.id);
        const { companyId } = req.user;
        // Validação básica dos dados recebidos
        if (!name?.trim()) {
            return res.status(400).json({
                error: "Nome da campanha é obrigatório"
            });
        }
        if (!flowId) {
            return res.status(400).json({
                error: "Fluxo é obrigatório"
            });
        }
        if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
            return res.status(400).json({
                error: "Pelo menos uma frase é obrigatória"
            });
        }
        // Validação para whatsappIds (aceita tanto array quanto ID único para compatibilidade)
        let normalizedWhatsappIds = [];
        if (whatsappIds) {
            if (Array.isArray(whatsappIds)) {
                normalizedWhatsappIds = whatsappIds;
            }
            else if (typeof whatsappIds === 'number' || typeof whatsappIds === 'string') {
                normalizedWhatsappIds = [Number(whatsappIds)];
            }
        }
        if (normalizedWhatsappIds.length === 0) {
            return res.status(400).json({
                error: "Pelo menos uma conexão WhatsApp deve ser selecionada"
            });
        }
        // Validar se todas as frases têm texto
        const validPhrases = phrases.filter(p => p && p.text && p.text.trim());
        if (validPhrases.length === 0) {
            return res.status(400).json({
                error: "Pelo menos uma frase válida é obrigatória"
            });
        }
        console.log(`[CREATE CAMPAIGN] Criando campanha: ${name.trim()} para ${normalizedWhatsappIds.length} conexão(ões): ${normalizedWhatsappIds.join(', ')}`);
        const flow = await (0, CreateFlowCampaignService_1.default)({
            userId,
            name: name.trim(),
            companyId,
            phrases: validPhrases,
            whatsappIds: normalizedWhatsappIds,
            flowId,
            status: status !== undefined ? status : true
        });
        return res.status(201).json({
            success: true,
            data: flow,
            message: `Campanha criada com sucesso para ${normalizedWhatsappIds.length} conexão(ões)`
        });
    }
    catch (error) {
        console.error("[CREATE CAMPAIGN] Erro ao criar campanha:", error);
        if (error instanceof AppError_1.default) {
            return res.status(error.statusCode || 400).json({
                error: error.message
            });
        }
        return res.status(500).json({
            error: "Erro interno do servidor"
        });
    }
};
exports.createFlowCampaign = createFlowCampaign;
const flowCampaigns = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { page, limit, searchTerm } = req.query;
        console.log(`[LIST CAMPAIGNS] Listando campanhas para empresa ${companyId}`);
        const result = await (0, FlowsCampaignGetDataService_1.default)({
            companyId,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            searchTerm: searchTerm
        });
        // Garantir que sempre retornamos um array, mesmo se o service retornar undefined
        const flow = Array.isArray(result?.flow) ? result.flow :
            Array.isArray(result) ? result : [];
        console.log(`[LIST CAMPAIGNS] Encontradas ${flow.length} campanhas`);
        return res.status(200).json({
            success: true,
            // Retornar diretamente os dados que o frontend espera
            flow,
            count: result?.count || flow.length,
            hasMore: result?.hasMore || false,
            message: "Campanhas listadas com sucesso"
        });
    }
    catch (error) {
        console.error("[LIST CAMPAIGNS] Erro ao listar campanhas:", error);
        if (error instanceof AppError_1.default) {
            return res.status(error.statusCode || 400).json({
                error: error.message
            });
        }
        return res.status(500).json({
            error: "Erro interno do servidor"
        });
    }
};
exports.flowCampaigns = flowCampaigns;
const flowCampaign = async (req, res) => {
    try {
        const { idFlow } = req.params;
        const { companyId } = req.user;
        if (!idFlow) {
            return res.status(400).json({
                error: "ID da campanha é obrigatório"
            });
        }
        const id = parseInt(idFlow);
        if (isNaN(id)) {
            return res.status(400).json({
                error: "ID da campanha deve ser um número válido"
            });
        }
        console.log(`[GET CAMPAIGN] Buscando campanha ID: ${id} para empresa ${companyId}`);
        const result = await (0, GetFlowsCampaignDataService_1.default)({
            companyId,
            idFlow: id
        });
        console.log(`[GET CAMPAIGN] Campanha encontrada: ${result.details.name}`);
        // Retornar diretamente os dados da campanha
        // O frontend espera os dados no primeiro nível da resposta
        return res.status(200).json({
            success: true,
            // Retornar os dados da campanha diretamente, não aninhados em 'data'
            ...result.details,
            message: "Campanha encontrada com sucesso"
        });
    }
    catch (error) {
        console.error("[GET CAMPAIGN] Erro ao buscar campanha:", error);
        if (error instanceof AppError_1.default) {
            return res.status(error.statusCode || 400).json({
                error: error.message
            });
        }
        return res.status(500).json({
            error: "Erro interno do servidor"
        });
    }
};
exports.flowCampaign = flowCampaign;
const updateFlowCampaign = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { flowId, name, phrases, id, status, whatsappIds } = req.body;
        // Validação básica dos dados recebidos
        if (!id) {
            return res.status(400).json({
                error: "ID da campanha é obrigatório"
            });
        }
        if (!name?.trim()) {
            return res.status(400).json({
                error: "Nome da campanha é obrigatório"
            });
        }
        if (!flowId) {
            return res.status(400).json({
                error: "Fluxo é obrigatório"
            });
        }
        if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
            return res.status(400).json({
                error: "Pelo menos uma frase é obrigatória"
            });
        }
        // Validação para whatsappIds (aceita tanto array quanto ID único para compatibilidade)
        let normalizedWhatsappIds = [];
        if (whatsappIds) {
            if (Array.isArray(whatsappIds)) {
                normalizedWhatsappIds = whatsappIds;
            }
            else if (typeof whatsappIds === 'number' || typeof whatsappIds === 'string') {
                normalizedWhatsappIds = [Number(whatsappIds)];
            }
        }
        if (normalizedWhatsappIds.length === 0) {
            return res.status(400).json({
                error: "Pelo menos uma conexão WhatsApp deve ser selecionada"
            });
        }
        // Validar se todas as frases têm texto
        const validPhrases = phrases.filter(p => p && p.text && p.text.trim());
        if (validPhrases.length === 0) {
            return res.status(400).json({
                error: "Pelo menos uma frase válida é obrigatória"
            });
        }
        console.log(`[UPDATE CAMPAIGN] Atualizando campanha ID: ${id} - ${name.trim()} para ${normalizedWhatsappIds.length} conexão(ões): ${normalizedWhatsappIds.join(', ')}`);
        const flow = await (0, UpdateFlowCampaignService_1.default)({
            companyId,
            name: name.trim(),
            flowId,
            phrases: validPhrases,
            id,
            status: status !== undefined ? status : true,
            whatsappIds: normalizedWhatsappIds
        });
        return res.status(200).json({
            success: true,
            data: flow,
            message: `Campanha atualizada com sucesso para ${normalizedWhatsappIds.length} conexão(ões)`
        });
    }
    catch (error) {
        console.error("[UPDATE CAMPAIGN] Erro ao atualizar campanha:", error);
        if (error instanceof AppError_1.default) {
            return res.status(error.statusCode || 400).json({
                error: error.message
            });
        }
        return res.status(500).json({
            error: "Erro interno do servidor"
        });
    }
};
exports.updateFlowCampaign = updateFlowCampaign;
const deleteFlowCampaign = async (req, res) => {
    try {
        const { idFlow } = req.params;
        if (!idFlow) {
            return res.status(400).json({
                error: "ID da campanha é obrigatório"
            });
        }
        const flowIdInt = parseInt(idFlow);
        if (isNaN(flowIdInt)) {
            return res.status(400).json({
                error: "ID da campanha deve ser um número válido"
            });
        }
        console.log(`[DELETE CAMPAIGN] Deletando campanha ID: ${flowIdInt}`);
        const flow = await (0, DeleteFlowCampaignService_1.default)(flowIdInt);
        console.log(`[DELETE CAMPAIGN] Campanha deletada: ${flow.name}`);
        return res.status(200).json({
            success: true,
            data: flow,
            message: "Campanha removida com sucesso"
        });
    }
    catch (error) {
        console.error("[DELETE CAMPAIGN] Erro ao remover campanha:", error);
        if (error instanceof AppError_1.default) {
            return res.status(error.statusCode || 400).json({
                error: error.message
            });
        }
        return res.status(500).json({
            error: "Erro interno do servidor"
        });
    }
};
exports.deleteFlowCampaign = deleteFlowCampaign;
