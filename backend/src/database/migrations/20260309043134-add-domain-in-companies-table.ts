import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: queryInterface => {
    return queryInterface.addColumn("Companies", "domain", {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  down: queryInterface => {
    return queryInterface.removeColumn("Companies", "domain");
  }
};
