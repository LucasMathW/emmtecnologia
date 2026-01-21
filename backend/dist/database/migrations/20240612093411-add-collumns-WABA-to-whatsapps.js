"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return Promise.all([
            queryInterface.addColumn("Whatsapps", "phone_number_id", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            }),
            queryInterface.addColumn("Whatsapps", "waba_id", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            }),
            queryInterface.addColumn("Whatsapps", "send_token", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            }),
            queryInterface.addColumn("Whatsapps", "business_id", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            }),
            queryInterface.addColumn("Whatsapps", "phone_number", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            }),
            queryInterface.addColumn("Whatsapps", "waba_webhook", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            })
        ]);
    },
    down: (queryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("Whatsapps", "phone_number_id"),
            queryInterface.removeColumn("Whatsapps", "waba_id"),
            queryInterface.removeColumn("Whatsapps", "send_token"),
            queryInterface.removeColumn("Whatsapps", "business_id"),
            queryInterface.removeColumn("Whatsapps", "phone_number")
        ]);
    }
};
