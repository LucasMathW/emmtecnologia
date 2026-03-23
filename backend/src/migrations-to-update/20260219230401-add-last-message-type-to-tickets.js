"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("Tickets");

    if (!table.lastMessageType) {
      await queryInterface.addColumn("Tickets", "lastMessageType", {
        type: Sequelize.STRING(30),
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Tickets", "lastMessageType");
  }
};
