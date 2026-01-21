"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FlowDefault_1 = require("../../models/FlowDefault");
const CreateFlowDefaultService = async ({ userId, companyId, flowIdWelcome, flowIdPhrase, flowIdInactiveTime }) => {
    try {
        const flow = await FlowDefault_1.FlowDefaultModel.create({
            userId: userId,
            companyId: companyId,
            flowIdWelcome,
            flowIdNotPhrase: flowIdPhrase,
            flowIdInactiveTime
        });
        return flow;
    }
    catch (error) {
        console.error("Erro ao inserir o usuário:", error);
        return error;
    }
};
exports.default = CreateFlowDefaultService;
