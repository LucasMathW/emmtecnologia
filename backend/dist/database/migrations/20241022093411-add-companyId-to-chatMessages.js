"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        const tableDescription = await queryInterface.describeTable("ChatMessages");
        if (!tableDescription.companyId) {
            await queryInterface.addColumn("ChatMessages", "companyId", {
                type: sequelize_1.DataTypes.INTEGER,
                references: {
                    model: "Companies",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: true,
            });
            await queryInterface.sequelize.query(`
        UPDATE "ChatMessages" SET "companyId" = (SELECT "companyId" FROM "Chats" WHERE "Chats"."id" = "ChatMessages"."chatId")
      `);
        }
        else {
            console.log("A coluna 'companyId' já existe. Ignorando a criação.");
        }
    },
    down: async (queryInterface) => {
        const tableDescription = await queryInterface.describeTable("ChatMessages");
        if (tableDescription.companyId) {
            await queryInterface.removeColumn("ChatMessages", "companyId");
        }
        else {
            console.log("A coluna 'companyId' não existe. Ignorando a remoção.");
        }
    }
};
