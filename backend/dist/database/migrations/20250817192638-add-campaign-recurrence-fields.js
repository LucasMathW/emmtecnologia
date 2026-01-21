"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addColumn('Campaigns', 'isRecurring', {
            type: sequelize_1.DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        });
        await queryInterface.addColumn('Campaigns', 'recurrenceType', {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true
        });
        await queryInterface.addColumn('Campaigns', 'recurrenceInterval', {
            type: sequelize_1.DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: true
        });
        await queryInterface.addColumn('Campaigns', 'recurrenceDaysOfWeek', {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true
        });
        await queryInterface.addColumn('Campaigns', 'recurrenceDayOfMonth', {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: true
        });
        await queryInterface.addColumn('Campaigns', 'recurrenceEndDate', {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true
        });
        await queryInterface.addColumn('Campaigns', 'maxExecutions', {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: true
        });
        await queryInterface.addColumn('Campaigns', 'executionCount', {
            type: sequelize_1.DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false
        });
        await queryInterface.addColumn('Campaigns', 'nextScheduledAt', {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true
        });
        await queryInterface.addColumn('Campaigns', 'lastExecutedAt', {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true
        });
    },
    down: async (queryInterface) => {
        const columns = [
            'isRecurring', 'recurrenceType', 'recurrenceInterval',
            'recurrenceDaysOfWeek', 'recurrenceDayOfMonth', 'recurrenceEndDate',
            'maxExecutions', 'executionCount', 'nextScheduledAt', 'lastExecutedAt'
        ];
        for (const column of columns) {
            await queryInterface.removeColumn('Campaigns', column);
        }
    }
};
