"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addColumn("Tickets", "valorVenda", {
            type: sequelize_1.DataTypes.FLOAT,
            allowNull: true
        });
        await queryInterface.addColumn("Tickets", "motivoNaoVenda", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true
        });
        await queryInterface.addColumn("Tickets", "finalizadoComVenda", {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn("Tickets", "valorVenda");
        await queryInterface.removeColumn("Tickets", "motivoNaoVenda");
        await queryInterface.removeColumn("Tickets", "finalizadoComVenda");
    }
};
