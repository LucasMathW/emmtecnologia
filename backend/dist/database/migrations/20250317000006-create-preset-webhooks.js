"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/database/migrations/001-create-preset-webhooks.ts
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('PresetWebhooks', {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            companyId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'Companies',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            name: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true
            },
            provider: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false
            },
            configuration: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            isSystem: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false
            }
        });
        // Índices para performance e isolamento
        await queryInterface.addIndex('PresetWebhooks', ['companyId']);
        await queryInterface.addIndex('PresetWebhooks', ['provider']);
        await queryInterface.addIndex('PresetWebhooks', ['isActive']);
        await queryInterface.addIndex('PresetWebhooks', ['isSystem']);
        await queryInterface.addIndex('PresetWebhooks', ['companyId', 'isActive']);
        await queryInterface.addIndex('PresetWebhooks', ['companyId', 'provider']);
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('PresetWebhooks');
    }
};
