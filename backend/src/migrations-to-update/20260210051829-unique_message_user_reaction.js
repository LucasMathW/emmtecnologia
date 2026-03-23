"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1️⃣ Remove duplicatas existentes (mantém a menor ID)
    await queryInterface.sequelize.query(`
      DELETE FROM "MessageReactions" a
      USING "MessageReactions" b
      WHERE a.id > b.id
        AND a."messageId" = b."messageId"
        AND a."userId" = b."userId";
    `);

    // 2️⃣ Cria constraint UNIQUE para garantir 1 reação por usuário por mensagem
    await queryInterface.addConstraint("MessageReactions", {
      fields: ["messageId", "userId"],
      type: "unique",
      name: "unique_message_user_reaction"
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove a constraint (rollback)
    await queryInterface.removeConstraint(
      "MessageReactions",
      "unique_message_user_reaction"
    );
  }
};
