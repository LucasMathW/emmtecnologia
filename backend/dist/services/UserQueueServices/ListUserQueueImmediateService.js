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
const Contact_1 = __importDefault(require("../../models/Contact"));
const ContactWallet_1 = __importDefault(require("../../models/ContactWallet"));
const ListUserQueueImmediateService = async (queueId, ticketId) => {
    // Se temos ticketId, verificar se o contato possui contactWallet
    if (ticketId) {
        const ticket = await Ticket_1.default.findByPk(ticketId, {
            include: [
                {
                    model: Contact_1.default,
                    as: "contact",
                    include: [
                        {
                            model: ContactWallet_1.default,
                            as: "contactWallets"
                        }
                    ]
                }
            ]
        });
        if (ticket && ticket.contact && ticket.contact.contactWallets && ticket.contact.contactWallets.length > 0) {
            // Buscar a carteira ativa para esta fila
            const activeWallet = ticket.contact.contactWallets.find(wallet => wallet.queueId === queueId);
            if (activeWallet) {
                console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId}] Contato possui carteira definida, atribuindo automaticamente`, {
                    contactId: ticket.contact.id,
                    walletUserId: activeWallet.walletId,
                    queueId
                });
                // Buscar o UserQueue correspondente à carteira
                const userQueue = await UserQueue_1.default.findOne({
                    where: {
                        queueId: queueId,
                        userId: activeWallet.walletId
                    }
                });
                if (!userQueue) {
                    console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId}] UserQueue não encontrado para carteira, usando roteamento normal`, { walletUserId: activeWallet.walletId, queueId });
                    // Fallback para roteamento normal se UserQueue não existir
                    const fallbackUserQueue = await UserQueue_1.default.findOne({
                        where: {
                            queueId: {
                                [sequelize_1.Op.or]: [queueId]
                            }
                        },
                        order: sequelize_1.Sequelize.literal('random()')
                    });
                    if (!fallbackUserQueue) {
                        throw new AppError_1.default("ERR_NOT_FOUND_USER_IN_QUEUE", 404);
                    }
                    return {
                        userId: fallbackUserQueue.userId,
                        userQueue: fallbackUserQueue,
                        isImmediate: false
                    };
                }
                return {
                    userId: activeWallet.walletId,
                    userQueue,
                    isImmediate: true // Atribuição imediata para carteira
                };
            }
            else {
                console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId}] Contato possui carteira mas não para esta fila, usando roteamento normal`, {
                    contactId: ticket.contact.id,
                    contactWalletsCount: ticket.contact.contactWallets.length,
                    queueId
                });
                // Usar lógica normal de roteamento quando há carteira mas não para esta fila
                const userQueue = await UserQueue_1.default.findOne({
                    where: {
                        queueId: {
                            [sequelize_1.Op.or]: [queueId]
                        }
                    },
                    order: sequelize_1.Sequelize.literal('random()')
                });
                if (!userQueue) {
                    throw new AppError_1.default("ERR_NOT_FOUND_USER_IN_QUEUE", 404);
                }
                return {
                    userId: userQueue.userId,
                    userQueue,
                    isImmediate: false
                };
            }
        }
    }
    // Buscar a fila com as configurações
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
    console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId ?? "-"}] Fila carregada`, {
        queueId,
        companyId: queue.companyId,
        randomizeImmediate: queue.randomizeImmediate,
        ativarRoteador: queue.ativarRoteador,
        typeRandomMode: queue.typeRandomMode,
        usersCount: queue.users?.length ?? 0,
        users: (queue.users || []).map(u => ({ id: u.id, profile: u.profile, online: u.online }))
    });
    // Verificar se a randomização imediata está ativada
    if (!queue.randomizeImmediate || !queue.ativarRoteador) {
        // Usar lógica normal de roteamento
        console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId ?? "-"}] Modo normal de roteamento ativo`, { queueId, typeRandomMode: queue.typeRandomMode });
        const userQueue = await UserQueue_1.default.findOne({
            where: {
                queueId: {
                    [sequelize_1.Op.or]: [queueId]
                }
            },
            order: queue.typeRandomMode === "ORDENADO"
                ? [["id", "ASC"]]
                : sequelize_1.Sequelize.literal('random()')
        });
        if (!userQueue) {
            throw new AppError_1.default("ERR_NOT_FOUND_USER_IN_QUEUE", 404);
        }
        console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId ?? "-"}] Usuário escolhido no modo normal`, { userId: userQueue.userId, queueId });
        return {
            userId: userQueue.userId,
            userQueue,
            isImmediate: false
        };
    }
    // Lógica de randomização imediata
    const users = queue.users;
    if (!users || users.length === 0) {
        throw new AppError_1.default("ERR_NO_USERS_IN_QUEUE", 404);
    }
    // Calcular carga (tickets ativos) por usuário e escolher o(s) mais leve(s)
    const eligibleUsers = [];
    const userIdToActiveTicketsCount = {};
    for (const user of users) {
        if (user.profile === "admin") {
            console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId ?? "-"}] Usuário ignorado por perfil admin`, { userId: user.id });
            continue;
        }
        const activeTickets = await Ticket_1.default.count({
            where: {
                userId: user.id,
                status: { [sequelize_1.Op.in]: ["open", "pending"] },
                companyId: queue.companyId
            }
        });
        eligibleUsers.push(user);
        userIdToActiveTicketsCount[user.id] = activeTickets;
        console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId ?? "-"}] Carga do usuário`, { userId: user.id, activeTickets, online: user.online });
    }
    if (eligibleUsers.length === 0) {
        console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId ?? "-"}] Nenhum usuário elegível (exceto admins) associado à fila ${queueId}`, {
            totalUsers: users.length,
            usersWithAdminProfile: users.filter(u => u.profile === "admin").length,
            eligibleUsersCount: eligibleUsers.length
        });
        // Fallback: usar todos os usuários da fila, incluindo admins se necessário
        console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId ?? "-"}] Usando fallback - todos os usuários da fila`, { fallbackUsers: users.map(u => ({ id: u.id, name: u.name, profile: u.profile })) });
        // Se não há usuários na fila, retornar erro
        if (users.length === 0) {
            throw new AppError_1.default("ERR_NO_USERS_IN_QUEUE", 404);
        }
        // Usar todos os usuários como fallback
        for (const user of users) {
            const activeTickets = await Ticket_1.default.count({
                where: {
                    userId: user.id,
                    status: { [sequelize_1.Op.in]: ["open", "pending"] },
                    companyId: queue.companyId
                }
            });
            eligibleUsers.push(user);
            userIdToActiveTicketsCount[user.id] = activeTickets;
        }
    }
    // Primeiro, preferir quem tem 0 tickets. Se não houver, pegar menor carga
    const usersWithZero = eligibleUsers.filter(u => userIdToActiveTicketsCount[u.id] === 0);
    let usersToChooseFrom = usersWithZero;
    if (usersToChooseFrom.length === 0) {
        const minLoad = Math.min(...eligibleUsers.map(u => userIdToActiveTicketsCount[u.id]));
        usersToChooseFrom = eligibleUsers.filter(u => userIdToActiveTicketsCount[u.id] === minLoad);
    }
    console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId ?? "-"}] Pool de seleção`, {
        poolSize: usersToChooseFrom.length,
        pool: usersToChooseFrom.map(u => ({ id: u.id, name: u.name, load: userIdToActiveTicketsCount[u.id] })),
        minLoadInPool: Math.min(...usersToChooseFrom.map(u => userIdToActiveTicketsCount[u.id])),
        typeRandomMode: queue.typeRandomMode
    });
    // Segurança: se por algum motivo o pool estiver vazio, cair para todos elegíveis
    if (usersToChooseFrom.length === 0) {
        usersToChooseFrom = eligibleUsers;
    }
    let selectedUser;
    if (queue.typeRandomMode === "ORDENADO") {
        // Ordenar por nome do usuário (A, B, C...)
        usersToChooseFrom.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        selectedUser = usersToChooseFrom[0]; // Primeiro da lista ordenada
        console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId ?? "-"}] Usuário selecionado por ordem alfabética`, { selectedUserId: selectedUser.id, selectedUserName: selectedUser.name });
    }
    else {
        // Selecionar usuário aleatório
        const randomIndex = Math.floor(Math.random() * usersToChooseFrom.length);
        selectedUser = usersToChooseFrom[randomIndex];
        console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId ?? "-"}] Usuário selecionado aleatoriamente`, { selectedUserId: selectedUser.id, selectedUserName: selectedUser.name });
    }
    // Buscar o UserQueue correspondente
    const userQueue = await UserQueue_1.default.findOne({
        where: {
            queueId: queueId,
            userId: selectedUser.id
        }
    });
    if (!userQueue) {
        console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId ?? "-"}] Associação UserQueue não encontrada para usuário selecionado`, { selectedUserId: selectedUser.id, queueId });
        throw new AppError_1.default("ERR_USER_QUEUE_NOT_FOUND", 404);
    }
    console.log(`[IMMEDIATE RANDOMIZATION][ticket:${ticketId ?? "-"}] Associação UserQueue encontrada`, { selectedUserId: selectedUser.id, userQueueId: userQueue.id });
    return {
        userId: selectedUser.id,
        userQueue,
        isImmediate: true
    };
};
exports.default = ListUserQueueImmediateService;
