"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        const tableDescription = await queryInterface.describeTable("ChatMessages");
        if (!tableDescription.mediaType) {
            await queryInterface.addColumn("ChatMessages", "mediaType", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            });
        }
        else {
            console.log("A coluna 'mediaType' já existe. Ignorando a criação.");
        }
    },
    down: async (queryInterface) => {
        const tableDescription = await queryInterface.describeTable("ChatMessages");
        if (tableDescription.mediaType) {
            await queryInterface.removeColumn("ChatMessages", "mediaType");
        }
        else {
            console.log("A coluna 'mediaType' não existe. Ignorando a remoção.");
        }
    }
};
