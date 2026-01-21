"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.addColumn("Queues", "tipoIntegracao", {
            type: sequelize_1.DataTypes.STRING,
            defaultValue: null
        });
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn("Queues", "tipoIntegracao");
    }
};
