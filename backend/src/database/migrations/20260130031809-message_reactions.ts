import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("MessageReactions", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      messageId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Messages",
          key: "id"
        },
        onDelete: "CASCADE"
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      emoji: {
        type: Sequelize.STRING(10),
        allowNull: false
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async queryInterface => {
    await queryInterface.dropTable("MessageReactions");
  }
};
