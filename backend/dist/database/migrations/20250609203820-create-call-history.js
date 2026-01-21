"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.createTable("CallHistory", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            user_id: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false
            },
            token_wavoip: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false
            },
            whatsapp_id: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false
            },
            contact_id: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false
            },
            company_id: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false
            },
            phone_to: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false
            },
            name: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            },
            url: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW
            }
        });
    },
    down: (queryInterface) => {
        return queryInterface.dropTable("CallHistory");
    }
};
