"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addColumn("CompaniesSettings", "informarValorVenda", {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });
        await queryInterface.addColumn("CompaniesSettings", "motivosFinalizacao", {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn("CompaniesSettings", "informarValorVenda");
        await queryInterface.removeColumn("CompaniesSettings", "motivosFinalizacao");
    }
};
