"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.addColumn('QuickMessages', 'mediaType', {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
            comment: 'Tipo de mídia: image, audio, video, document'
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('QuickMessages', 'mediaType');
    }
};
