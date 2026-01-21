"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        const tableDescription = await queryInterface.describeTable("Whatsapps");
        if (!tableDescription.timeAwaitActiveFlowId) {
            await queryInterface.addColumn("Whatsapps", "timeAwaitActiveFlowId", {
                type: sequelize_1.DataTypes.INTEGER,
                references: {
                    model: "FlowBuilders",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
                allowNull: true
            });
        }
    },
    down: async (queryInterface) => {
        const tableDescription = await queryInterface.describeTable("Whatsapps");
        if (tableDescription.timeAwaitActiveFlowId) {
            await queryInterface.removeColumn("Whatsapps", "timeAwaitActiveFlowId");
        }
    },
};
