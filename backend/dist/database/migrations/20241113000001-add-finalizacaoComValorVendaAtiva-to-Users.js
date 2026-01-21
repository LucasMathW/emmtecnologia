"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addColumn("Users", "finalizacaoComValorVendaAtiva", {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn("Users", "finalizacaoComValorVendaAtiva");
    }
};
