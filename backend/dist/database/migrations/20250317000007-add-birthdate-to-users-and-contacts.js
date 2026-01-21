"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/database/migrations/20250123001-add-birthdate-to-users-and-contacts.ts
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        // Adicionar birthDate à tabela Users
        await queryInterface.addColumn('Users', 'birthDate', {
            type: sequelize_1.DataTypes.DATEONLY,
            allowNull: true,
            comment: 'Data de nascimento do usuário'
        });
        // Adicionar birthDate à tabela Contacts
        await queryInterface.addColumn('Contacts', 'birthDate', {
            type: sequelize_1.DataTypes.DATEONLY,
            allowNull: true,
            comment: 'Data de nascimento do contato'
        });
        // Adicionar índices para otimizar consultas de aniversário
        await queryInterface.addIndex('Users', ['birthDate'], {
            name: 'idx_users_birth_date'
        });
        await queryInterface.addIndex('Contacts', ['birthDate'], {
            name: 'idx_contacts_birth_date'
        });
    },
    down: async (queryInterface) => {
        // Remover índices
        await queryInterface.removeIndex('Users', 'idx_users_birth_date');
        await queryInterface.removeIndex('Contacts', 'idx_contacts_birth_date');
        // Remover colunas
        await queryInterface.removeColumn('Users', 'birthDate');
        await queryInterface.removeColumn('Contacts', 'birthDate');
    }
};
