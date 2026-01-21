"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return Promise.all([
            queryInterface.addColumn("Schedules", "reminderDate", {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                defaultValue: null
            }),
            queryInterface.addColumn("Schedules", "reminderMessage", {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                defaultValue: null
            }),
            queryInterface.addColumn("Schedules", "reminderSentAt", {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                defaultValue: null
            }),
            queryInterface.addColumn("Schedules", "reminderStatus", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
                defaultValue: null
            })
        ]);
    },
    down: (queryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("Schedules", "reminderDate"),
            queryInterface.removeColumn("Schedules", "reminderMessage"),
            queryInterface.removeColumn("Schedules", "reminderSentAt"),
            queryInterface.removeColumn("Schedules", "reminderStatus")
        ]);
    }
};
