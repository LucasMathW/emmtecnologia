"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addColumn("Tickets", "motivoFinalizacao", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn("Tickets", "motivoFinalizacao");
    }
};
