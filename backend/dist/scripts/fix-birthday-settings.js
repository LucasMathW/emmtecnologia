"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/scripts/fix-birthday-settings.ts
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../database"));
const fixBirthdaySettings = async () => {
    try {
        console.log('🔧 Verificando e corrigindo tabela BirthdaySettings...');
        const queryInterface = database_1.default.getQueryInterface();
        // Verificar se a tabela existe
        const tableExists = await queryInterface.describeTable('BirthdaySettings');
        if (!tableExists) {
            console.log('❌ Tabela BirthdaySettings não existe. Criando...');
            await queryInterface.createTable('BirthdaySettings', {
                id: {
                    type: sequelize_1.DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                companyId: {
                    type: sequelize_1.DataTypes.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'Companies',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                userBirthdayEnabled: {
                    type: sequelize_1.DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                contactBirthdayEnabled: {
                    type: sequelize_1.DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                userBirthdayMessage: {
                    type: sequelize_1.DataTypes.TEXT,
                    allowNull: true,
                    defaultValue: '🎉 Parabéns, {nome}! Hoje é seu dia especial! Desejamos muito sucesso e felicidade! '
                },
                contactBirthdayMessage: {
                    type: sequelize_1.DataTypes.TEXT,
                    allowNull: true,
                    defaultValue: '🎉 Parabéns, {nome}! Hoje é seu aniversário! Desejamos muito sucesso, saúde e felicidade! ✨'
                },
                sendBirthdayTime: {
                    type: sequelize_1.DataTypes.TIME,
                    allowNull: false,
                    defaultValue: '09:00:00'
                },
                createAnnouncementForUsers: {
                    type: sequelize_1.DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                whatsappId: {
                    type: sequelize_1.DataTypes.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'Whatsapps',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
                },
                createdAt: {
                    type: sequelize_1.DataTypes.DATE,
                    allowNull: false
                },
                updatedAt: {
                    type: sequelize_1.DataTypes.DATE,
                    allowNull: false
                }
            });
            // Criar índice único para companyId
            await queryInterface.addIndex('BirthdaySettings', ['companyId'], {
                unique: true,
                name: 'idx_birthday_settings_company_id'
            });
            console.log('✅ Tabela BirthdaySettings criada com sucesso!');
        }
        else {
            console.log('✅ Tabela BirthdaySettings existe.');
            // Verificar se a coluna whatsappId existe
            const hasWhatsappId = 'whatsappId' in tableExists;
            if (!hasWhatsappId) {
                console.log('❌ Coluna whatsappId não existe. Adicionando...');
                await queryInterface.addColumn('BirthdaySettings', 'whatsappId', {
                    type: sequelize_1.DataTypes.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'Whatsapps',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
                });
                console.log('✅ Coluna whatsappId adicionada com sucesso!');
            }
            else {
                console.log('✅ Coluna whatsappId já existe.');
            }
        }
        // Inserir configurações padrão para empresas que não têm
        const [results] = await database_1.default.query(`
      INSERT INTO "BirthdaySettings" ("companyId", "userBirthdayEnabled", "contactBirthdayEnabled", "userBirthdayMessage", "contactBirthdayMessage", "sendBirthdayTime", "createAnnouncementForUsers", "whatsappId", "createdAt", "updatedAt")
      SELECT
        id as "companyId",
        true as "userBirthdayEnabled",
        true as "contactBirthdayEnabled",
        '🎉 Parabéns, {nome}! Hoje é seu dia especial! Desejamos muito sucesso e felicidade! ' as "userBirthdayMessage",
        '🎉 Parabéns, {nome}! Hoje é seu aniversário! Desejamos muito sucesso, saúde e felicidade! ✨' as "contactBirthdayMessage",
        '09:00:00' as "sendBirthdayTime",
        true as "createAnnouncementForUsers",
        NULL as "whatsappId",
        NOW() as "createdAt",
        NOW() as "updatedAt"
      FROM "Companies"
      WHERE NOT EXISTS (
        SELECT 1 FROM "BirthdaySettings" WHERE "companyId" = "Companies".id
      )
    `);
        console.log('✅ Configurações padrão inseridas para empresas existentes.');
        console.log('🎉 Correção da tabela BirthdaySettings concluída com sucesso!');
    }
    catch (error) {
        console.error('❌ Erro ao corrigir tabela BirthdaySettings:', error);
        throw error;
    }
};
// Executar se chamado diretamente
if (require.main === module) {
    fixBirthdaySettings()
        .then(() => {
        console.log('✅ Script executado com sucesso!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Erro na execução do script:', error);
        process.exit(1);
    });
}
exports.default = fixBirthdaySettings;
