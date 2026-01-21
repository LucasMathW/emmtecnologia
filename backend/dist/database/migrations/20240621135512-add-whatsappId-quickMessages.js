"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return Promise.all([
            queryInterface.addColumn("QuickMessages", "whatsappId", {
                type: sequelize_1.DataTypes.INTEGER,
                references: {
                    model: "Whatsapps",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            })
        ]);
    },
    down: (queryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("QuickMessages", "whatsappId")
        ]);
    }
};
