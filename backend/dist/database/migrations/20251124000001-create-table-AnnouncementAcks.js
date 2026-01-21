"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.createTable("AnnouncementAcks", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            announcementId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: { model: "Announcements", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            companyId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: { model: "Companies", key: "id" },
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
        });
        await queryInterface.addIndex("AnnouncementAcks", ["announcementId", "companyId"], {
            unique: true,
            name: "uniq_announcement_ack"
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeIndex("AnnouncementAcks", "uniq_announcement_ack");
        await queryInterface.dropTable("AnnouncementAcks");
    }
};
