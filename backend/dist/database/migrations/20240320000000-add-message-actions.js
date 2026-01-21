"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addColumn("ChatMessages", "isEdited", {
            type: sequelize_1.DataTypes.BOOLEAN,
            defaultValue: false
        });
        await queryInterface.addColumn("ChatMessages", "isDeleted", {
            type: sequelize_1.DataTypes.BOOLEAN,
            defaultValue: false
        });
        await queryInterface.addColumn("ChatMessages", "forwardedFromId", {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "ChatMessages",
                key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL"
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn("ChatMessages", "isEdited");
        await queryInterface.removeColumn("ChatMessages", "isDeleted");
        await queryInterface.removeColumn("ChatMessages", "forwardedFromId");
    }
};
