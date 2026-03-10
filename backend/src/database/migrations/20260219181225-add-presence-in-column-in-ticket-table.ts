import { QueryInterface, DataTypes } from "sequelize";

"use strict";

export default {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn("Tickets", "presence", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn("Tickets", "presence");
  }
};
