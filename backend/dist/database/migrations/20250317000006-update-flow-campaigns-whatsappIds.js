"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        // Adicionar nova coluna whatsappIds
        await queryInterface.addColumn('FlowCampaigns', 'whatsappIds', {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true
        });
        // Migrar dados existentes: converter whatsappId único para array
        await queryInterface.sequelize.query(`
      UPDATE "FlowCampaigns" 
      SET "whatsappIds" = CASE 
        WHEN "whatsappId" IS NOT NULL THEN CONCAT('[', "whatsappId", ']')
        ELSE '[]'
      END
      WHERE "whatsappIds" IS NULL
    `);
        // Tornar a coluna obrigatória após migração
        await queryInterface.changeColumn('FlowCampaigns', 'whatsappIds', {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: false,
            defaultValue: '[]'
        });
        console.log('✅ Migração concluída: whatsappIds adicionado e dados migrados');
    },
    down: async (queryInterface) => {
        // Remover coluna whatsappIds
        await queryInterface.removeColumn('FlowCampaigns', 'whatsappIds');
        console.log('✅ Rollback concluído: whatsappIds removido');
    }
};
