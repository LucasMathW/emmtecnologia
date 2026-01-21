"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.addColumn("Queues", "typeRandomMode", {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: false,
            defaultValue: "RANDOM"
        });
    },
    down: (queryInterface) => {
        queryInterface.removeColumn("Queues", "typeRandomMode");
    }
};
