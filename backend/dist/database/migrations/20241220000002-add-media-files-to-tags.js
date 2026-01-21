"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addColumn("Tags", "mediaFiles", {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
            comment: "JSON array with media files information"
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn("Tags", "mediaFiles");
    },
};
