// src/scripts/fix-birthday-settings.ts
import { QueryInterface, DataTypes } from 'sequelize';
import db from '../database';

const fixBirthdaySettings = async () => {
  try {
    
    const queryInterface = db.getQueryInterface();
    
    // Verificar se a tabela existe
    const tableExists = await queryInterface.describeTable('BirthdaySettings');
    
    if (!tableExists) {
      
      await queryInterface.createTable('BirthdaySettings', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        companyId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'Companies',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        userBirthdayEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        contactBirthdayEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        userBirthdayMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
          defaultValue: '🎉 Parabéns, {nome}! Hoje é seu dia especial! Desejamos muito sucesso e felicidade! '
        },
        contactBirthdayMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
          defaultValue: '🎉 Parabéns, {nome}! Hoje é seu aniversário! Desejamos muito sucesso, saúde e felicidade! ✨'
        },
        sendBirthdayTime: {
          type: DataTypes.TIME,
          allowNull: false,
          defaultValue: '09:00:00'
        },
        createAnnouncementForUsers: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        whatsappId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'Whatsapps',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
      });

      // Criar índice único para companyId
      await queryInterface.addIndex('BirthdaySettings', ['companyId'], {
        unique: true,
        name: 'idx_birthday_settings_company_id'
      });

      
    } else {
      
      // Verificar se a coluna whatsappId existe
      const hasWhatsappId = 'whatsappId' in tableExists;
      if (!hasWhatsappId) {
        
        await queryInterface.addColumn('BirthdaySettings', 'whatsappId', {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'Whatsapps',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
        
      } else {
      }
    }

    // Inserir configurações padrão para empresas que não têm
    const [results] = await db.query(`
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

    
  } catch (error) {
    console.error('❌ Erro ao corrigir tabela BirthdaySettings:', error);
    throw error;
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  fixBirthdaySettings()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na execução do script:', error);
      process.exit(1);
    });
}

export default fixBirthdaySettings;
