"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCnpj = exports.getOnlineUsers = exports.updateOnlineStatus = exports.toggleChangeWidht = exports.mediaUpload = exports.list = exports.remove = exports.update = exports.showEmail = exports.show = exports.store = exports.index = void 0;
const socket_1 = require("../libs/socket");
const lodash_1 = require("lodash");
const CheckSettings_1 = __importDefault(require("../helpers/CheckSettings"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const CreateUserService_1 = __importDefault(require("../services/UserServices/CreateUserService"));
const ListUsersService_1 = __importDefault(require("../services/UserServices/ListUsersService"));
const UpdateUserService_1 = __importDefault(require("../services/UserServices/UpdateUserService"));
const ShowUserService_1 = __importDefault(require("../services/UserServices/ShowUserService"));
const DeleteUserService_1 = __importDefault(require("../services/UserServices/DeleteUserService"));
const SimpleListService_1 = __importDefault(require("../services/UserServices/SimpleListService"));
const CreateCompanyService_1 = __importDefault(require("../services/CompanyService/CreateCompanyService"));
const SendMail_1 = require("../helpers/SendMail");
const useDate_1 = require("../utils/useDate");
const ShowCompanyService_1 = __importDefault(require("../services/CompanyService/ShowCompanyService"));
const wbot_1 = require("../libs/wbot");
const FindCompaniesWhatsappService_1 = __importDefault(require("../services/CompanyService/FindCompaniesWhatsappService"));
const User_1 = __importDefault(require("../models/User"));
const lodash_2 = require("lodash");
const ToggleChangeWidthService_1 = __importDefault(require("../services/UserServices/ToggleChangeWidthService"));
const APIShowEmailUserService_1 = __importDefault(require("../services/UserServices/APIShowEmailUserService"));
const UpdateUserOnlineStatusService_1 = __importDefault(require("../services/UserServices/UpdateUserOnlineStatusService"));
const GetOnlineUsersService_1 = __importDefault(require("../services/UserServices/GetOnlineUsersService"));
const Chat_1 = __importDefault(require("../models/Chat"));
const ChatUser_1 = __importDefault(require("../models/ChatUser"));
const Plan_1 = __importDefault(require("../models/Plan"));
const axios_1 = __importDefault(require("axios"));
const index = async (req, res) => {
    const { searchParam, pageNumber } = req.query;
    const { companyId, profile } = req.user;
    const { users, count, hasMore } = await (0, ListUsersService_1.default)({
        searchParam,
        pageNumber,
        companyId,
        profile
    });
    return res.json({ users, count, hasMore });
};
exports.index = index;
const store = async (req, res) => {
    const { email, password, name, phone, profile, companyId: bodyCompanyId, queueIds, companyName, planId, startWork, endWork, whatsappId, allTicket, defaultTheme, defaultMenu, allowGroup, allHistoric, allUserChat, userClosePendingTicket, showDashboard, defaultTicketsManagerWidth = 550, allowRealTime, allowConnections, showContacts, showCampaign, showFlow, birthDate, allowSeeMessagesInPendingTickets = "enabled", document // CNPJ da empresa
     } = req.body;
    let userCompanyId = null;
    const { dateToClient } = (0, useDate_1.useDate)();
    if (req.user !== undefined) {
        const { companyId: cId } = req.user;
        userCompanyId = cId;
    }
    if (req.url === "/signup" &&
        (await (0, CheckSettings_1.default)("userCreation")) === "disabled") {
        throw new AppError_1.default("ERR_USER_CREATION_DISABLED", 403);
    }
    else if (req.url !== "/signup" && req.user.profile !== "admin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    if (process.env.DEMO === "ON") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    // Validar se CNPJ foi fornecido no signup
    if (req.url === "/signup" && (!document || document.trim() === "")) {
        throw new AppError_1.default("CNPJ é obrigatório para o cadastro", 400);
    }
    const companyUser = bodyCompanyId || userCompanyId;
    let plan = null;
    if (planId) {
        plan = await Plan_1.default.findByPk(planId, {
            attributes: ["id", "name", "trial", "trialDays"]
        });
    }
    if (!companyUser) {
        let date = "";
        if (plan.trial === true) {
            const dataNowMoreTwoDays = new Date();
            dataNowMoreTwoDays.setDate(dataNowMoreTwoDays.getDate() + Number(plan?.trialDays || 3));
            date = dataNowMoreTwoDays.toISOString().split("T")[0];
        }
        else {
            const dataNowMoreTwoDays = new Date();
            dataNowMoreTwoDays.setDate(dataNowMoreTwoDays.getDate() + 3);
            date = dataNowMoreTwoDays.toISOString().split("T")[0];
        }
        const companyData = {
            name: companyName,
            email: email,
            phone: phone,
            planId: planId,
            status: true,
            dueDate: date,
            recurrence: "",
            document: document ? document.replace(/\D/g, '') : "",
            paymentMethod: "",
            password: password,
            companyUserName: name,
            startWork: startWork,
            endWork: endWork,
            defaultTheme: "light",
            defaultMenu: "closed",
            allowGroup: false,
            allHistoric: false,
            userClosePendingTicket: "enabled",
            allowSeeMessagesInPendingTickets: "enabled",
            showDashboard: "disabled",
            defaultTicketsManagerWidth: 550,
            allowRealTime: "disabled",
            allowConnections: "disabled"
        };
        const user = await (0, CreateCompanyService_1.default)(companyData);
        try {
            const _email = {
                to: email,
                subject: `Login e senha da Empresa ${companyName}`,
                text: `Olá ${name}, este é um email sobre o cadastro da ${companyName}!<br><br>
        Segue os dados da sua empresa:<br><br>Nome: ${companyName}<br>Email: ${email}<br>Senha: ${password}<br>Data Vencimento Trial: ${dateToClient(date)}`
            };
            await (0, SendMail_1.SendMail)(_email);
        }
        catch (error) {
            console.log("Não consegui enviar o email");
        }
        try {
            const company = await (0, ShowCompanyService_1.default)(1);
            const whatsappCompany = await (0, FindCompaniesWhatsappService_1.default)(company.id);
            if (whatsappCompany.whatsapps[0].status === "CONNECTED" &&
                (phone !== undefined || !(0, lodash_1.isNil)(phone) || !(0, lodash_1.isEmpty)(phone))) {
                const whatsappId = whatsappCompany.whatsapps[0].id;
                const wbot = await (0, wbot_1.getWbot)(whatsappId);
                const body = `Olá ${name}, este é uma mensagem sobre o cadastro da ${companyName}!\n\nSegue os dados da sua empresa:\n\nNome: ${companyName}\nEmail: ${email}\nSenha: ${password}\nData Vencimento Trial: ${dateToClient(date)}`;
                await wbot.sendMessage(`55${phone}@s.whatsapp.net`, { text: body });
            }
        }
        catch (error) {
            console.log("Não consegui enviar a mensagem");
        }
        return res.status(200).json(user);
    }
    if (companyUser) {
        const user = await (0, CreateUserService_1.default)({
            email,
            password,
            name,
            profile,
            companyId: companyUser,
            queueIds,
            startWork,
            endWork,
            whatsappId,
            allTicket,
            defaultTheme,
            defaultMenu,
            allowGroup,
            allHistoric,
            allUserChat,
            userClosePendingTicket,
            showDashboard,
            defaultTicketsManagerWidth,
            allowRealTime,
            allowConnections,
            showContacts,
            showCampaign,
            showFlow,
            birthDate,
            allowSeeMessagesInPendingTickets
        });
        const userData = await User_1.default.findByPk(user.id);
        await User_1.default.createInitialChat(userData);
        const chats = await Chat_1.default.findAll({
            include: [
                {
                    model: ChatUser_1.default,
                    where: { userId: user.id }
                }
            ]
        });
        const io = (0, socket_1.getIO)();
        io.of(userCompanyId.toString()).emit(`company-${userCompanyId}-user`, {
            action: "create",
            user
        });
        return res.status(200).json({ user, chats });
    }
};
exports.store = store;
const show = async (req, res) => {
    const { userId } = req.params;
    const { companyId } = req.user;
    const user = await (0, ShowUserService_1.default)(userId, companyId);
    return res.status(200).json(user);
};
exports.show = show;
const showEmail = async (req, res) => {
    const { email } = req.params;
    const user = await (0, APIShowEmailUserService_1.default)(email);
    return res.status(200).json(user);
};
exports.showEmail = showEmail;
const update = async (req, res) => {
    // if (req.user.profile !== "admin") {
    //   throw new AppError("ERR_NO_PERMISSION", 403);
    // }
    if (process.env.DEMO === "ON") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const { id: requestUserId, companyId } = req.user;
    const { userId } = req.params;
    const userData = req.body;
    const user = await (0, UpdateUserService_1.default)({
        userData,
        userId,
        companyId,
        requestUserId: +requestUserId
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-user`, {
        action: "update",
        user
    });
    return res.status(200).json(user);
};
exports.update = update;
const remove = async (req, res) => {
    const { userId } = req.params;
    const { companyId, id, profile } = req.user;
    if (profile !== "admin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    if (process.env.DEMO === "ON") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const user = await User_1.default.findOne({
        where: { id: userId }
    });
    if (companyId !== user.companyId) {
        return res
            .status(400)
            .json({ error: "Você não possui permissão para acessar este recurso!" });
    }
    else {
        await (0, DeleteUserService_1.default)(userId, companyId);
        const io = (0, socket_1.getIO)();
        io.of(String(companyId)).emit(`company-${companyId}-user`, {
            action: "delete",
            userId
        });
        return res.status(200).json({ message: "User deleted" });
    }
};
exports.remove = remove;
const list = async (req, res) => {
    const { companyId } = req.query;
    const { companyId: userCompanyId } = req.user;
    const users = await (0, SimpleListService_1.default)({
        companyId: companyId ? +companyId : userCompanyId
    });
    return res.status(200).json(users);
};
exports.list = list;
const mediaUpload = async (req, res) => {
    const { userId } = req.params;
    const { companyId } = req.user;
    const files = req.files;
    const file = (0, lodash_2.head)(files);
    if (!file) {
        throw new AppError_1.default("Nenhum arquivo foi enviado", 400);
    }
    try {
        let user = await User_1.default.findByPk(userId);
        if (!user) {
            throw new AppError_1.default("Usuário não encontrado", 404);
        }
        if (user.companyId !== companyId) {
            throw new AppError_1.default("Usuário não pertence a esta empresa", 403);
        }
        // Salvar apenas o nome do arquivo (sem caminho)
        user.profileImage = file.filename;
        await user.save();
        // Buscar usuário atualizado com todas as relações
        user = await (0, ShowUserService_1.default)(userId, companyId);
        // Emitir evento socket para atualizar em tempo real
        const io = (0, socket_1.getIO)();
        io.of(String(companyId)).emit(`company-${companyId}-user`, {
            action: "update",
            user
        });
        return res.status(200).json({
            user,
            message: "Imagem atualizada com sucesso"
        });
    }
    catch (err) {
        console.error("Erro no upload da imagem:", err);
        throw new AppError_1.default(err.message || "Erro interno do servidor");
    }
};
exports.mediaUpload = mediaUpload;
const toggleChangeWidht = async (req, res) => {
    var { userId } = req.params;
    const { defaultTicketsManagerWidth } = req.body;
    const { companyId } = req.user;
    const user = await (0, ToggleChangeWidthService_1.default)({
        userId,
        defaultTicketsManagerWidth
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-user`, {
        action: "update",
        user
    });
    return res.status(200).json(user);
};
exports.toggleChangeWidht = toggleChangeWidht;
const updateOnlineStatus = async (req, res) => {
    const { userId } = req.params;
    const { online } = req.body;
    await (0, UpdateUserOnlineStatusService_1.default)({
        userId: +userId,
        online
    });
    return res.status(200).json({ message: "Status updated" });
};
exports.updateOnlineStatus = updateOnlineStatus;
const getOnlineUsers = async (req, res) => {
    const { companyId } = req.user;
    const users = await (0, GetOnlineUsersService_1.default)({
        companyId
    });
    return res.status(200).json(users);
};
exports.getOnlineUsers = getOnlineUsers;
const validateCnpj = async (req, res) => {
    const { cnpj } = req.body;
    if (!cnpj) {
        throw new AppError_1.default("CPF ou CNPJ é obrigatório", 400);
    }
    // Limpar o documento (remover formatação)
    const cleanDocument = cnpj.replace(/\D/g, '');
    // Detectar se é CPF ou CNPJ
    const isCpf = cleanDocument.length === 11;
    const isCnpj = cleanDocument.length === 14;
    if (!isCpf && !isCnpj) {
        throw new AppError_1.default("CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos", 400);
    }
    if (isCpf) {
        // Validação local do CPF
        if (!validateCpf(cleanDocument)) {
            throw new AppError_1.default("CPF inválido", 400);
        }
        return res.status(200).json({
            valid: true,
            data: {
                nome: "Pessoa Física",
                cpf: cleanDocument,
                tipo: "cpf"
            }
        });
    }
    // Validação do CNPJ na Receita Federal
    try {
        const response = await axios_1.default.get(`https://receitaws.com.br/v1/cnpj/${cleanDocument}`);
        const data = response.data;
        if (data.status === "ERROR") {
            throw new AppError_1.default("CNPJ inválido ou não encontrado na Receita Federal", 400);
        }
        return res.status(200).json({
            valid: true,
            data: {
                nome: data.nome,
                cnpj: cleanDocument,
                email: data.email,
                telefone: data.telefone,
                logradouro: data.logradouro,
                numero: data.numero,
                complemento: data.complemento,
                bairro: data.bairro,
                municipio: data.municipio,
                uf: data.uf,
                cep: data.cep,
                situacao: data.situacao,
                tipo: "cnpj"
            }
        });
    }
    catch (error) {
        console.error("Erro ao validar CNPJ:", error);
        if (error.response?.status === 404) {
            throw new AppError_1.default("CNPJ não encontrado na Receita Federal", 404);
        }
        throw new AppError_1.default("Erro ao validar CNPJ. Tente novamente.", 500);
    }
};
exports.validateCnpj = validateCnpj;
// Função para validar CPF
const validateCpf = (cpf) => {
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf))
        return false;
    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11)
        remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9)))
        return false;
    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11)
        remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10)))
        return false;
    return true;
};
exports.default = {
    index: exports.index,
    store: exports.store,
    show: exports.show,
    showEmail: exports.showEmail,
    update: exports.update,
    remove: exports.remove,
    list: exports.list,
    mediaUpload: exports.mediaUpload,
    toggleChangeWidht: exports.toggleChangeWidht,
    updateOnlineStatus: exports.updateOnlineStatus,
    getOnlineUsers: exports.getOnlineUsers,
    validateCnpj: exports.validateCnpj
};
