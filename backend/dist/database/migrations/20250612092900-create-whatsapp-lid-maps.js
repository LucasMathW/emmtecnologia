"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface
            .createTable("WhatsappLidMaps", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            lid: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false
            },
            companyId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false
            },
            contactId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "Contacts",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
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
        })
            .then(() => queryInterface.addIndex("WhatsappLidMaps", ["lid"]))
            .then(() => queryInterface.addIndex("WhatsappLidMaps", ["companyId"]))
            .then(() => queryInterface.addConstraint("WhatsappLidMaps", {
            fields: ["lid", "companyId"],
            type: "unique",
            name: "unique_lid_companyId"
        }));
    },
    down: (queryInterface) => {
        return queryInterface.dropTable("WhatsappLidMaps");
    }
};
