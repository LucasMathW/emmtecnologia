"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.createTable("CompanyKanbanConfigs", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            companyId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: { model: "Companies", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            laneOrder: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "JSON array with lane IDs in order",
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
        });
        await queryInterface.addIndex("CompanyKanbanConfigs", ["companyId"], {
            name: "idx_company_kanban_config_company_id",
            unique: true,
        });
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable("CompanyKanbanConfigs");
    },
};
