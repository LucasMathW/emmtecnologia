import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("ChatMessages") as { [key: string]: any };

    if (!tableDescription.mediaType) {
      await queryInterface.addColumn("ChatMessages", "mediaType", {
        type: DataTypes.STRING,
        allowNull: true,
      });

    } else {
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("ChatMessages") as { [key: string]: any };

    if (tableDescription.mediaType) {
      await queryInterface.removeColumn("ChatMessages", "mediaType");
    } else {
    }
  }
};
