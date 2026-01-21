"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncTemplatesOficial = exports.showAdmin = exports.removeAdmin = exports.updateAdmin = exports.listAll = exports.restart = exports.remove = exports.closedTickets = exports.update = exports.show = exports.storeFacebook = exports.store = exports.indexFilter = exports.index = void 0;
const socket_1 = require("../libs/socket");
const cache_1 = __importDefault(require("../libs/cache"));
const wbot_1 = require("../libs/wbot");
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const DeleteBaileysService_1 = __importDefault(require("../services/BaileysServices/DeleteBaileysService"));
const ShowCompanyService_1 = __importDefault(require("../services/CompanyService/ShowCompanyService"));
const graphAPI_1 = require("../services/FacebookServices/graphAPI");
const ShowPlanService_1 = __importDefault(require("../services/PlanService/ShowPlanService"));
const StartWhatsAppSession_1 = require("../services/WbotServices/StartWhatsAppSession");
const CreateWhatsAppService_1 = __importDefault(require("../services/WhatsappService/CreateWhatsAppService"));
const DeleteWhatsAppService_1 = __importDefault(require("../services/WhatsappService/DeleteWhatsAppService"));
const ListWhatsAppsService_1 = __importDefault(require("../services/WhatsappService/ListWhatsAppsService"));
const ShowWhatsAppService_1 = __importDefault(require("../services/WhatsappService/ShowWhatsAppService"));
const UpdateWhatsAppService_1 = __importDefault(require("../services/WhatsappService/UpdateWhatsAppService"));
const ImportWhatsAppMessageService_1 = require("../services/WhatsappService/ImportWhatsAppMessageService");
const ShowWhatsAppServiceAdmin_1 = __importDefault(require("../services/WhatsappService/ShowWhatsAppServiceAdmin"));
const UpdateWhatsAppServiceAdmin_1 = __importDefault(require("../services/WhatsappService/UpdateWhatsAppServiceAdmin"));
const ListAllWhatsAppService_1 = __importDefault(require("../services/WhatsappService/ListAllWhatsAppService"));
const ListFilterWhatsAppsService_1 = __importDefault(require("../services/WhatsappService/ListFilterWhatsAppsService"));
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("../utils/logger"));
const whatsAppOficial_service_1 = require("../libs/whatsAppOficial/whatsAppOficial.service");
const QuickMessageComponent_1 = __importDefault(require("../models/QuickMessageComponent"));
const CreateService_1 = __importDefault(require("../services/QuickMessageService/CreateService"));
const QuickMessage_1 = __importDefault(require("../models/QuickMessage"));
const index = async (req, res) => {
    const { companyId } = req.user;
    const { session } = req.query;
    const whatsapps = await (0, ListWhatsAppsService_1.default)({ companyId, session });
    return res.status(200).json(whatsapps);
};
exports.index = index;
const indexFilter = async (req, res) => {
    const { companyId } = req.user;
    const { session, channel } = req.query;
    const whatsapps = await (0, ListFilterWhatsAppsService_1.default)({
        companyId,
        session,
        channel
    });
    return res.status(200).json(whatsapps);
};
exports.indexFilter = indexFilter;
const store = async (req, res) => {
    const { name, status, isDefault, greetingMessage, complationMessage, outOfHoursMessage, queueIds, token, maxUseBotQueues, timeUseBotQueues, expiresTicket, allowGroup, timeSendQueue, sendIdQueue, timeInactiveMessage, inactiveMessage, ratingMessage, maxUseBotQueuesNPS, expiresTicketNPS, whenExpiresTicket, expiresInactiveMessage, importOldMessages, importRecentMessages, closedTicketsPostImported, importOldMessagesGroups, groupAsTicket, timeCreateNewTicket, schedules, promptId, collectiveVacationEnd, collectiveVacationMessage, collectiveVacationStart, queueIdImportMessages, phone_number_id, waba_id, send_token, business_id, phone_number, color, waba_webhook, channel } = req.body;
    const { companyId } = req.user;
    const company = await (0, ShowCompanyService_1.default)(companyId);
    const plan = await (0, ShowPlanService_1.default)(company.planId);
    if (!plan.useWhatsapp) {
        return res.status(400).json({
            error: "Você não possui permissão para acessar este recurso!"
        });
    }
    const { whatsapp, oldDefaultWhatsapp } = await (0, CreateWhatsAppService_1.default)({
        name,
        status,
        isDefault,
        greetingMessage,
        complationMessage,
        outOfHoursMessage,
        queueIds,
        companyId,
        token,
        maxUseBotQueues,
        timeUseBotQueues,
        expiresTicket,
        allowGroup,
        timeSendQueue,
        sendIdQueue,
        timeInactiveMessage,
        inactiveMessage,
        ratingMessage,
        maxUseBotQueuesNPS,
        expiresTicketNPS,
        whenExpiresTicket,
        expiresInactiveMessage,
        importOldMessages,
        importRecentMessages,
        closedTicketsPostImported,
        importOldMessagesGroups,
        groupAsTicket,
        timeCreateNewTicket,
        schedules,
        promptId,
        collectiveVacationEnd,
        collectiveVacationMessage,
        collectiveVacationStart,
        queueIdImportMessages,
        phone_number_id,
        waba_id,
        send_token,
        business_id,
        phone_number,
        waba_webhook,
        channel,
        color
    });
    if (["whatsapp_oficial"].includes(whatsapp.channel)) {
        try {
            const company = {
                companyId: String(whatsapp.companyId),
                companyName: whatsapp.company.name
            };
            const whatsappOficial = {
                token_mult100: whatsapp.token,
                phone_number_id: whatsapp.phone_number_id,
                waba_id: whatsapp.waba_id,
                send_token: whatsapp.send_token,
                business_id: whatsapp.business_id,
                phone_number: whatsapp.phone_number,
                idEmpresaMult100: whatsapp.companyId
            };
            const data = {
                email: whatsapp.company.email,
                company,
                whatsApp: whatsappOficial
            };
            const { webhookLink, connectionId } = await (0, whatsAppOficial_service_1.CreateCompanyConnectionOficial)(data);
            if (webhookLink) {
                whatsapp.waba_webhook = webhookLink;
                whatsapp.waba_webhook_id = connectionId;
                whatsapp.status = "CONNECTED";
                await whatsapp.save();
            }
        }
        catch (error) {
            logger_1.default.info("ERROR", error);
        }
    }
    if (["whatsapp"].includes(whatsapp.channel)) {
        (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, companyId);
    }
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
        action: "update",
        whatsapp
    });
    if (oldDefaultWhatsapp) {
        io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
            action: "update",
            whatsapp: oldDefaultWhatsapp
        });
    }
    return res.status(200).json(whatsapp);
};
exports.store = store;
const storeFacebook = async (req, res) => {
    try {
        const { facebookUserId, facebookUserToken, addInstagram } = req.body;
        const { companyId } = req.user;
        // const company = await ShowCompanyService(companyId)
        // const plan = await ShowPlanService(company.planId);
        // if (!plan.useFacebook) {
        //   return res.status(400).json({
        //     error: "Você não possui permissão para acessar este recurso!"
        //   });
        // }
        const { data } = await (0, graphAPI_1.getPageProfile)(facebookUserId, facebookUserToken);
        if (data.length === 0) {
            return res.status(400).json({
                error: "Facebook page not found"
            });
        }
        const io = (0, socket_1.getIO)();
        const pages = [];
        for await (const page of data) {
            const { name, access_token, id, instagram_business_account } = page;
            const acessTokenPage = await (0, graphAPI_1.getAccessTokenFromPage)(access_token);
            if (instagram_business_account && addInstagram) {
                const { id: instagramId, username, name: instagramName } = instagram_business_account;
                pages.push({
                    companyId,
                    name: `Insta ${username || instagramName}`,
                    facebookUserId: facebookUserId,
                    facebookPageUserId: instagramId,
                    facebookUserToken: acessTokenPage,
                    tokenMeta: facebookUserToken,
                    isDefault: false,
                    channel: "instagram",
                    status: "CONNECTED",
                    greetingMessage: "",
                    farewellMessage: "",
                    queueIds: [],
                    isMultidevice: false
                });
                pages.push({
                    companyId,
                    name,
                    facebookUserId: facebookUserId,
                    facebookPageUserId: id,
                    facebookUserToken: acessTokenPage,
                    tokenMeta: facebookUserToken,
                    isDefault: false,
                    channel: "facebook",
                    status: "CONNECTED",
                    greetingMessage: "",
                    farewellMessage: "",
                    queueIds: [],
                    isMultidevice: false
                });
                await (0, graphAPI_1.subscribeApp)(id, acessTokenPage);
            }
            if (!instagram_business_account) {
                pages.push({
                    companyId,
                    name,
                    facebookUserId: facebookUserId,
                    facebookPageUserId: id,
                    facebookUserToken: acessTokenPage,
                    tokenMeta: facebookUserToken,
                    isDefault: false,
                    channel: "facebook",
                    status: "CONNECTED",
                    greetingMessage: "",
                    farewellMessage: "",
                    queueIds: [],
                    isMultidevice: false
                });
                await (0, graphAPI_1.subscribeApp)(page.id, acessTokenPage);
            }
        }
        for await (const pageConection of pages) {
            const exist = await Whatsapp_1.default.findOne({
                where: {
                    facebookPageUserId: pageConection.facebookPageUserId
                }
            });
            if (exist) {
                await exist.update({
                    ...pageConection
                });
            }
            if (!exist) {
                const { whatsapp } = await (0, CreateWhatsAppService_1.default)(pageConection);
                io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
                    action: "update",
                    whatsapp
                });
            }
        }
        return res.status(200);
    }
    catch (error) {
        console.log(error);
        return res.status(400).json({
            error: "Facebook page not found"
        });
    }
};
exports.storeFacebook = storeFacebook;
const show = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    const { session } = req.query;
    // console.log("SHOWING WHATSAPP", whatsappId)
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId, companyId, session);
    return res.status(200).json(whatsapp);
};
exports.show = show;
const update = async (req, res) => {
    const { whatsappId } = req.params;
    const whatsappData = req.body;
    const { companyId } = req.user;
    // DEBUG - Log dos dados recebidos
    console.log(`[WHATSAPP-UPDATE] Dados recebidos para conexão ${whatsappId}:`, {
        flowIdNotPhrase: whatsappData.flowIdNotPhrase,
        flowIdWelcome: whatsappData.flowIdWelcome,
        flowIdInactiveTime: whatsappData.flowIdInactiveTime
    });
    const { whatsapp, oldDefaultWhatsapp } = await (0, UpdateWhatsAppService_1.default)({
        whatsappData,
        whatsappId,
        companyId
    });
    if (["whatsapp_oficial"].includes(whatsapp.channel)) {
        try {
            const whatsappOficial = {
                token_mult100: whatsapp.token,
                phone_number_id: whatsapp.phone_number_id,
                waba_id: whatsapp.waba_id,
                send_token: whatsapp.send_token,
                business_id: whatsapp.business_id,
                phone_number: whatsapp.phone_number,
                idEmpresaMult100: companyId
            };
            await (0, whatsAppOficial_service_1.UpdateConnectionWhatsAppOficial)(whatsapp.waba_webhook_id, whatsappOficial);
        }
        catch (error) {
            logger_1.default.info("ERROR", error);
        }
    }
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
        action: "update",
        whatsapp
    });
    if (oldDefaultWhatsapp) {
        io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
            action: "update",
            whatsapp: oldDefaultWhatsapp
        });
    }
    return res.status(200).json(whatsapp);
};
exports.update = update;
const closedTickets = async (req, res) => {
    const { whatsappId } = req.params;
    (0, ImportWhatsAppMessageService_1.closeTicketsImported)(whatsappId);
    return res.status(200).json("whatsapp");
};
exports.closedTickets = closedTickets;
const remove = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId, profile } = req.user;
    const io = (0, socket_1.getIO)();
    if (profile !== "admin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId, companyId);
    if (whatsapp.channel === "whatsapp") {
        await (0, DeleteBaileysService_1.default)(whatsappId);
        await (0, DeleteWhatsAppService_1.default)(whatsappId);
        await cache_1.default.delFromPattern(`sessions:${whatsappId}:*`);
        (0, wbot_1.removeWbot)(+whatsappId);
        io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
            action: "delete",
            whatsappId: +whatsappId
        });
    }
    if (whatsapp.channel === "whatsapp_oficial") {
        await Whatsapp_1.default.destroy({
            where: {
                id: +whatsappId
            }
        });
        try {
            await (0, whatsAppOficial_service_1.DeleteConnectionWhatsAppOficial)(whatsapp.waba_webhook_id);
        }
        catch (error) {
            logger_1.default.info("ERROR", error);
        }
        io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
            action: "delete",
            whatsappId: +whatsappId
        });
    }
    if (whatsapp.channel === "facebook" || whatsapp.channel === "instagram") {
        const { facebookUserToken } = whatsapp;
        const getAllSameToken = await Whatsapp_1.default.findAll({
            where: {
                facebookUserToken
            }
        });
        await Whatsapp_1.default.destroy({
            where: {
                facebookUserToken
            }
        });
        for await (const whatsapp of getAllSameToken) {
            io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
                action: "delete",
                whatsappId: whatsapp.id
            });
        }
    }
    return res.status(200).json({ message: "Session disconnected." });
};
exports.remove = remove;
const restart = async (req, res) => {
    const { companyId, profile, id } = req.user;
    const user = await User_1.default.findByPk(id);
    const { allowConnections } = user;
    if (profile !== "admin" && allowConnections === "disabled") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    await (0, wbot_1.restartWbot)(companyId);
    return res.status(200).json({ message: "Whatsapp restart." });
};
exports.restart = restart;
const listAll = async (req, res) => {
    const { companyId } = req.user;
    const { session } = req.query;
    const whatsapps = await (0, ListAllWhatsAppService_1.default)({ session });
    return res.status(200).json(whatsapps);
};
exports.listAll = listAll;
const updateAdmin = async (req, res) => {
    const { whatsappId } = req.params;
    const whatsappData = req.body;
    const { companyId } = req.user;
    const { whatsapp, oldDefaultWhatsapp } = await (0, UpdateWhatsAppServiceAdmin_1.default)({
        whatsappData,
        whatsappId,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`admin-whatsapp`, {
        action: "update",
        whatsapp
    });
    if (oldDefaultWhatsapp) {
        io.of(String(companyId)).emit(`admin-whatsapp`, {
            action: "update",
            whatsapp: oldDefaultWhatsapp
        });
    }
    return res.status(200).json(whatsapp);
};
exports.updateAdmin = updateAdmin;
const removeAdmin = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    const io = (0, socket_1.getIO)();
    console.log("REMOVING WHATSAPP ADMIN", whatsappId);
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId, companyId);
    if (whatsapp.channel === "whatsapp") {
        await (0, DeleteBaileysService_1.default)(whatsappId);
        await (0, DeleteWhatsAppService_1.default)(whatsappId);
        await cache_1.default.delFromPattern(`sessions:${whatsappId}:*`);
        (0, wbot_1.removeWbot)(+whatsappId);
        io.of(String(companyId)).emit(`admin-whatsapp`, {
            action: "delete",
            whatsappId: +whatsappId
        });
    }
    if (whatsapp.channel === "facebook" || whatsapp.channel === "instagram") {
        const { facebookUserToken } = whatsapp;
        const getAllSameToken = await Whatsapp_1.default.findAll({
            where: {
                facebookUserToken
            }
        });
        await Whatsapp_1.default.destroy({
            where: {
                facebookUserToken
            }
        });
        for await (const whatsapp of getAllSameToken) {
            io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
                action: "delete",
                whatsappId: whatsapp.id
            });
        }
    }
    return res.status(200).json({ message: "Session disconnected." });
};
exports.removeAdmin = removeAdmin;
const showAdmin = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    // console.log("SHOWING WHATSAPP ADMIN", whatsappId)
    const whatsapp = await (0, ShowWhatsAppServiceAdmin_1.default)(whatsappId);
    return res.status(200).json(whatsapp);
};
exports.showAdmin = showAdmin;
const syncTemplatesOficial = async (req, res) => {
    const { companyId, id: userId } = req.user;
    const { whatsappId } = req.params;
    const whatsapp = await Whatsapp_1.default.findByPk(whatsappId);
    if (whatsapp.companyId !== companyId) {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const data = await (0, whatsAppOficial_service_1.getTemplatesWhatsAppOficial)(whatsapp.token);
    // console.log("CHEGOU NO SYNC", data)
    if (data.data.length > 0) {
        await Promise.all(data.data.map(async (template) => {
            const quickMessage = await QuickMessage_1.default.findOne({
                where: {
                    metaID: template.id
                },
                include: [
                    {
                        model: QuickMessageComponent_1.default,
                        as: "components"
                    }
                ]
            });
            if (quickMessage) {
                await quickMessage.update({
                    message: template.components?.find((c) => c.type === 'BODY' || c.type === 'body')?.text || template.name,
                    category: template.category,
                    status: template.status,
                    language: template.language
                });
                if (template?.components?.length > 0) {
                    if (quickMessage?.components?.length > 0) {
                        try {
                            await QuickMessageComponent_1.default.destroy({
                                where: {
                                    quickMessageId: quickMessage.id
                                }
                            });
                        }
                        catch (error) {
                            console.error("Error destroying QuickMessageComponents:", error);
                        }
                    }
                    else {
                    }
                    await Promise.all(template.components.map(async (component) => {
                        await QuickMessageComponent_1.default.create({
                            quickMessageId: quickMessage.id,
                            type: component.type,
                            text: component.text,
                            buttons: JSON.stringify(component?.buttons),
                            format: component?.format,
                            example: JSON.stringify(component?.example)
                        });
                    }));
                }
            }
            else {
                const templateData = {
                    shortcode: template.name,
                    message: template.components?.find((c) => c.type === 'BODY' || c.type === 'body')?.text || template.name,
                    companyId: companyId,
                    userId: userId,
                    geral: true,
                    isMedia: false,
                    mediaPath: null,
                    visao: true,
                    isOficial: true,
                    language: template.language,
                    status: template.status,
                    category: template.category,
                    metaID: template.id,
                    whatsappId: whatsapp.id
                };
                const qm = await (0, CreateService_1.default)(templateData);
                await Promise.all(template.components.map(async (component) => {
                    await QuickMessageComponent_1.default.create({
                        quickMessageId: qm.id,
                        type: component.type,
                        text: component.text,
                        buttons: JSON.stringify(component?.buttons),
                        format: component?.format,
                        example: JSON.stringify(component?.example)
                    });
                }));
            }
        }));
    }
    return res.status(200).json(data);
};
exports.syncTemplatesOficial = syncTemplatesOficial;
