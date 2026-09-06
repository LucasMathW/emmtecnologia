import { QueryInterface } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface) => {
    // Índice composto para acelerar a query DISTINCT ON ("ticketId") ORDER BY "ticketId", "updatedAt" DESC
    // usada no ListTicketsService para buscar a última mensagem por ticket em batch.
    // Sem este índice, o Postgres faz Sort em memória para todos os registros de cada ticketId.
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_ticket_updated_at
      ON "Messages" ("ticketId", "updatedAt" DESC);
    `);

    // Índice em MessageReactions.updatedAt para acelerar o ORDER BY mr."updatedAt" DESC
    // na query de última reação por ticket (JOIN com Messages WHERE ticketId IN (...)).
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_reactions_updated_at
      ON "MessageReactions" ("updatedAt" DESC);
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_messages_ticket_updated_at;
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_message_reactions_updated_at;
    `);
  }
};
