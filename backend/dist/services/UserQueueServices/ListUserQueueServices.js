"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const UserQueue_1 = __importDefault(require("../../models/UserQueue"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const User_1 = __importDefault(require("../../models/User"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const ListUserQueueServices = async (queueId) => {
    // Buscar a fila para verificar o tipo de roteamento
    const queue = await Queue_1.default.findByPk(queueId, {
        include: [
            {
                model: User_1.default,
                as: "users",
                through: { attributes: [] }
            }
        ]
    });
    if (!queue) {
        throw new AppError_1.default("ERR_QUEUE_NOT_FOUND", 404);
    }
    const usersInQueue = queue.users || [];
    if (usersInQueue.length === 0) {
        throw new AppError_1.default("ERR_NOT_FOUND_USER_IN_QUEUE", 404);
    }
    // Mapa de contagem de tickets pendentes por usuário na fila
    const userIds = usersInQueue.map(u => u.id);
    const pendingRows = await Ticket_1.default.findAll({
        attributes: [
            "userId",
            [sequelize_1.Sequelize.fn("COUNT", sequelize_1.Sequelize.col("id")), "pendingCount"]
        ],
        where: {
            queueId,
            status: "pending",
            userId: { [sequelize_1.Op.in]: userIds }
        },
        group: ["userId"]
    });
    const pendingByUserId = new Map();
    for (const row of pendingRows) {
        const r = row.get ? row.get() : row;
        pendingByUserId.set(Number(r.userId), Number(r.pendingCount));
    }
    // Preenche com zero para usuários sem tickets pendentes
    for (const u of usersInQueue) {
        if (!pendingByUserId.has(u.id))
            pendingByUserId.set(u.id, 0);
    }
    if (queue.typeRandomMode === "ORDENADO") {
        // Escolhe o usuário com menor quantidade de pendentes; desempate por nome ASC
        const usersWithCounts = usersInQueue
            .map(u => ({ user: u, count: pendingByUserId.get(u.id) || 0 }))
            .sort((a, b) => {
            if (a.count !== b.count)
                return a.count - b.count;
            return a.user.name.localeCompare(b.user.name);
        });
        const chosenUser = usersWithCounts[0]?.user;
        if (!chosenUser) {
            throw new AppError_1.default("ERR_NOT_FOUND_USER_IN_QUEUE", 404);
        }
        const chosenUserQueue = await UserQueue_1.default.findOne({
            where: { queueId, userId: chosenUser.id },
            include: [
                { model: User_1.default, as: "user", attributes: ["id", "name"] }
            ]
        });
        if (!chosenUserQueue) {
            throw new AppError_1.default("ERR_NOT_FOUND_USER_IN_QUEUE", 404);
        }
        return chosenUserQueue;
    }
    // RANDOM: seleciona em memória para evitar dependência de função de banco (RAND/RANDOM)
    const userQueues = await UserQueue_1.default.findAll({
        where: { queueId },
        include: [
            {
                model: User_1.default,
                as: "user",
                attributes: ["id", "name"]
            }
        ]
    });
    if (!userQueues || userQueues.length === 0) {
        throw new AppError_1.default("ERR_NOT_FOUND_USER_IN_QUEUE", 404);
    }
    const randomIndex = Math.floor(Math.random() * userQueues.length);
    return userQueues[randomIndex];
};
exports.default = ListUserQueueServices;
