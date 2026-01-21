"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// database/migrations/YYYYMMDDHHMMSS-update-flow-campaigns-phrase.ts
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        // Alterar o tipo da coluna phrase de STRING para TEXT
        // para suportar JSON maiores com múltiplas frases
        await queryInterface.changeColumn('FlowCampaigns', 'phrase', {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: false
        });
        console.log('Migração executada: Campo phrase atualizado para TEXT');
    },
    down: async (queryInterface) => {
        // Reverter para STRING (pode causar perda de dados se houver JSONs muito grandes)
        await queryInterface.changeColumn('FlowCampaigns', 'phrase', {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false
        });
        console.log('Migração revertida: Campo phrase voltou para STRING');
    }
};
