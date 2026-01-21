"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.addColumn("Users", "allowSeeMessagesInPendingTickets", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
            defaultValue: "enabled"
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn("Users", "allowSeeMessagesInPendingTickets");
    }
};
