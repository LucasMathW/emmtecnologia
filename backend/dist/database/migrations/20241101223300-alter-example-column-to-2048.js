"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.changeColumn("QuickMessageComponents", "example", {
            type: sequelize_1.DataTypes.STRING(2048),
            allowNull: true
        });
    },
    down: async (queryInterface) => {
        await queryInterface.changeColumn("QuickMessageComponents", "example", {
            type: sequelize_1.DataTypes.STRING(255),
            allowNull: true
        });
    }
};
