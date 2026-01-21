"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.addColumn("Chats", "isGroup", {
            type: sequelize_1.DataTypes.BOOLEAN,
            defaultValue: false
        });
        await queryInterface.addColumn("Chats", "groupName", {
            type: sequelize_1.DataTypes.STRING
        });
        await queryInterface.addColumn("Chats", "groupAdminId", {
            type: sequelize_1.DataTypes.INTEGER,
            references: { model: "Users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL"
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn("Chats", "isGroup");
        await queryInterface.removeColumn("Chats", "groupName");
        await queryInterface.removeColumn("Chats", "groupAdminId");
    }
};
