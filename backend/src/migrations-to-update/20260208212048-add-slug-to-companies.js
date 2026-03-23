"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Companies", "slug", {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Opcional: criar índice explícito
    await queryInterface.addIndex("Companies", ["slug"], {
      unique: true,
      name: "companies_slug_unique"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("Companies", "companies_slug_unique");
    await queryInterface.removeColumn("Companies", "slug");
  }
};
