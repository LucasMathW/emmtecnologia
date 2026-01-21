"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FlowDefault_1 = require("../../models/FlowDefault");
const UpdateFlowDefaultService = async ({ companyId, flowIdWelcome, flowIdPhrase, flowIdInactiveTime }) => {
    try {
        const flow = await FlowDefault_1.FlowDefaultModel.update({ flowIdWelcome, flowIdNotPhrase: flowIdPhrase, flowIdInactiveTime }, {
            where: { companyId }
        });
        return 'ok';
    }
    catch (error) {
        console.error("Erro ao inserir o usuário:", error);
        return error;
    }
};
exports.default = UpdateFlowDefaultService;
