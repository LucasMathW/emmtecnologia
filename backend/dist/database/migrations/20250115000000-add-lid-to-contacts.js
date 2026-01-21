"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addColumn("Contacts", "lid", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
            comment: "Linked Device ID para unificar contatos multi-dispositivo"
        });
        await queryInterface.addIndex("Contacts", ["lid", "companyId"], {
            name: "contacts_lid_company_idx"
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeIndex("Contacts", "contacts_lid_company_idx");
        await queryInterface.removeColumn("Contacts", "lid");
    }
};
