import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn("Messages", "transcribed", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn("Messages", "transcribed");
  }
};
