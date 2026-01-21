"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("MessageApis", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      companyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Companies",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },

      ticketId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Tickets",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },

      whatsappId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Whatsapps",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },

      contactId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Contacts",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },

      number: {
        type: Sequelize.STRING,
        allowNull: false
      },

      body: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      bodyBase64: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },

      queueId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Queues",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },

      sendSignature: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      closeTicket: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      base64: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      schedule: {
        type: Sequelize.DATE,
        allowNull: true
      },

      isSending: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      originalName: {
        type: Sequelize.STRING,
        allowNull: true
      },

      encoding: {
        type: Sequelize.STRING,
        allowNull: true
      },

      mimeType: {
        type: Sequelize.STRING,
        allowNull: true
      },

      size: {
        type: Sequelize.STRING,
        allowNull: true
      },

      destination: {
        type: Sequelize.STRING,
        allowNull: true
      },

      filename: {
        type: Sequelize.STRING,
        allowNull: true
      },

      path: {
        type: Sequelize.STRING,
        allowNull: true
      },

      buffer: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      mediaType: {
        type: Sequelize.STRING,
        allowNull: true
      },

      mediaUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW")
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW")
      }
    });

    // Índices importantes para a query de envio
    await queryInterface.addIndex("MessageApis", ["companyId"]);
    await queryInterface.addIndex("MessageApis", ["schedule"]);
    await queryInterface.addIndex("MessageApis", ["isSending"]);
  },

  down: async queryInterface => {
    await queryInterface.dropTable("MessageApis");
  }
};
