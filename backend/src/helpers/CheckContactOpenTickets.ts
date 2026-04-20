import { Op } from "sequelize";
import AppError from "../errors/AppError";
import Ticket from "../models/Ticket";
import User from "../models/User";
import Queue from "../models/Queue";

const CheckContactOpenTickets = async (
  contactId: number,
  whatsappId: number
): Promise<void> => {
  const ticket = await Ticket.findOne({
    where: {
      contactId,
      status: { [Op.or]: ["open", "pending", "chatbot"] }
      // Removido o filtro por whatsappId — verifica conflito em qualquer conexão
    },
    include: [
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name", "color"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      }
    ]
  });

  if (ticket) {
    // .get({ plain: true }) converte a instância Sequelize para objeto puro
    // garantindo que includes (user, queue) sejam serializados corretamente
    throw new AppError(JSON.stringify(ticket.get({ plain: true })), 409);
  }
};

export default CheckContactOpenTickets;
