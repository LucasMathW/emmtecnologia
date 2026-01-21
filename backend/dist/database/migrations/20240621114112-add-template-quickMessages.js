"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return Promise.all([
            queryInterface.addColumn("QuickMessages", "isOficial", {
                type: sequelize_1.DataTypes.BOOLEAN,
                defaultValue: false, // Assuming default value as false, you can change it if needed
            }),
            queryInterface.addColumn("QuickMessages", "language", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            }),
            queryInterface.addColumn("QuickMessages", "status", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            }),
            queryInterface.addColumn("QuickMessages", "category", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            }),
            queryInterface.addColumn("QuickMessages", "metaID", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            }),
        ]);
    },
    down: (queryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("QuickMessages", "isOficial"),
            queryInterface.removeColumn("QuickMessages", "language"),
            queryInterface.removeColumn("QuickMessages", "status"),
            queryInterface.removeColumn("QuickMessages", "category"),
            queryInterface.removeColumn("QuickMessages", "metaID"),
        ]);
    }
};
