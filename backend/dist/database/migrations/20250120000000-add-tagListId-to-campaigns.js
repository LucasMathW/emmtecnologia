"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.addColumn("Campaigns", "tagListId", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
            comment: "ID da tag para seleção de contatos"
        });
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn("Campaigns", "tagListId");
    }
};
