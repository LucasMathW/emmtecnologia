import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("MessageReactions", "fromJid", {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("MessageReactions", "fromJid");
  }
};
