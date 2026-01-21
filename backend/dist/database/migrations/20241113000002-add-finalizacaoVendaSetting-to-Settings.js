"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.bulkInsert("Settings", [
            {
                key: "finalizacaoVendaAtiva",
                value: "false",
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);
    },
    down: async (queryInterface) => {
        await queryInterface.bulkDelete("Settings", {
            key: "finalizacaoVendaAtiva"
        });
    }
};
