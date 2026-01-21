"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addColumn("Chats", "description", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
            defaultValue: ""
        });
        await queryInterface.addColumn("Chats", "groupImage", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
            defaultValue: ""
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn("Chats", "description");
        await queryInterface.removeColumn("Chats", "groupImage");
    }
};
