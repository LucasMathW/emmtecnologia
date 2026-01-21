"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
// Adicionar a coluna flowBuilderId na tabela Whatsapp
module.exports = {
    up: (queryInterface) => {
        return queryInterface.addColumn("Tickets", "maxUseInactiveTime", {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        });
    },
    down: (queryInterface) => {
        queryInterface.removeColumn("Tickets", "maxUseInactiveTime");
    }
};
