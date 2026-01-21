"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.addColumn("QuickMessageComponents", "buttons", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true
        }),
            queryInterface.addColumn("QuickMessageComponents", "format", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            }),
            queryInterface.addColumn("QuickMessageComponents", "example", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            });
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn("QuickMessageComponents", "buttons"),
            queryInterface.removeColumn("QuickMessageComponents", "format"),
            queryInterface.removeColumn("QuickMessageComponents", "example");
    }
};
