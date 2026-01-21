"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
// Adicionar a coluna flowBuilderId na tabela Whatsapp
module.exports = {
    up: (queryInterface) => {
        return queryInterface.addColumn("FlowDefaults", "flowIdInactiveTime", {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: true
        });
    },
    down: (queryInterface) => {
        // Remover a coluna flowBuilderId da tabela Whatsapp
        queryInterface.removeColumn("FlowDefaults", "flowIdInactiveTime");
    }
};
