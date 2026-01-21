"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.store = void 0;
const TicketTag_1 = __importDefault(require("../models/TicketTag"));
const Tag_1 = __importDefault(require("../models/Tag"));
const socket_1 = require("../libs/socket");
const ShowTicketService_1 = __importDefault(require("../services/TicketServices/ShowTicketService"));
const lodash_1 = require("lodash");
const SendWhatsAppMessage_1 = __importDefault(require("../services/WbotServices/SendWhatsAppMessage"));
const sendFacebookMessage_1 = require("../services/FacebookServices/sendFacebookMessage");
const SendWhatsAppMedia_1 = __importDefault(require("../services/WbotServices/SendWhatsAppMedia"));
const SendWhatsAppOficialMessage_1 = __importDefault(require("../services/WhatsAppOficial/SendWhatsAppOficialMessage"));
const store = async (req, res) => {
    const { ticketId, tagId } = req.params;
    const { companyId } = req.user;
    try {
        const ticketTag = await TicketTag_1.default.create({ ticketId, tagId });
        if (ticketTag) {
            const nextTag = await Tag_1.default.findOne({ where: { id: tagId } });
            if (!(0, lodash_1.isNil)(nextTag.greetingMessageLane) && nextTag.greetingMessageLane !== "") {
                const ticketUpdate = await (0, ShowTicketService_1.default)(ticketId, companyId);
                const bodyMessage = ticketUpdate.user ? `*${ticketUpdate.user.name}:*\n${nextTag.greetingMessageLane}` : nextTag.greetingMessageLane;
                if (ticketUpdate.channel === "whatsapp") {
                    // Enviar mensagem de texto
                    await (0, SendWhatsAppMessage_1.default)({ body: bodyMessage, ticket: ticketUpdate });
                    // Enviar mídias se existirem
                    if (nextTag.mediaFiles) {
                        try {
                            const mediaFiles = JSON.parse(nextTag.mediaFiles);
                            for (const mediaFile of mediaFiles) {
                                await (0, SendWhatsAppMedia_1.default)({
                                    media: mediaFile,
                                    ticket: ticketUpdate
                                });
                            }
                        }
                        catch (error) {
                            console.log("Error sending media files:", error);
                        }
                    }
                }
                if (["facebook", "instagram"].includes(ticketUpdate.channel)) {
                    try {
                        await (0, sendFacebookMessage_1.sendFacebookMessage)({ body: `\u200e ${bodyMessage}`, ticket: ticketUpdate });
                    }
                    catch (error) {
                        console.log("error", error);
                    }
                }
                if (ticketUpdate.channel === "whatsapp_oficial") {
                    await (0, SendWhatsAppOficialMessage_1.default)({
                        body: bodyMessage,
                        ticket: ticketUpdate,
                        quotedMsg: null,
                        type: 'text',
                        media: null,
                        vCard: null
                    });
                    if (nextTag.mediaFiles) {
                        try {
                            const mediaFiles = JSON.parse(nextTag.mediaFiles);
                            for (const mediaFile of mediaFiles) {
                                const mediaSrc = {
                                    fieldname: 'medias',
                                    originalname: mediaFile.originalname,
                                    encoding: '7bit',
                                    mimetype: mediaFile.mimetype,
                                    filename: mediaFile.filename,
                                    path: mediaFile.path
                                };
                                await (0, SendWhatsAppOficialMessage_1.default)({
                                    body: "",
                                    ticket: ticketUpdate,
                                    type: mediaFile.mimetype.split("/")[0],
                                    media: mediaSrc
                                });
                            }
                        }
                        catch (error) {
                            console.log("Error sending media files:", error);
                        }
                    }
                }
            }
        }
        const ticket = await (0, ShowTicketService_1.default)(ticketId, companyId);
        const io = (0, socket_1.getIO)();
        io.of(String(companyId))
            // .to(ticket.status)
            .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket
        });
        return res.status(201).json(ticketTag);
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to store ticket tag.' });
    }
};
exports.store = store;
/*
export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;

  console.log("remove");
  console.log(req.params);

  try {
    await TicketTag.destroy({ where: { ticketId } });
    return res.status(200).json({ message: 'Ticket tags removed successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to remove ticket tags.' });
  }
};
*/
const remove = async (req, res) => {
    const { ticketId } = req.params;
    const { companyId } = req.user;
    //console.log("remove");
    //console.log(req.params);
    try {
        // Retrieve tagIds associated with the provided ticketId from TicketTags
        const ticketTags = await TicketTag_1.default.findAll({ where: { ticketId } });
        const tagIds = ticketTags.map((ticketTag) => ticketTag.tagId);
        // Find the tagIds with kanban = 1 in the Tags table
        const tagsWithKanbanOne = await Tag_1.default.findAll({
            where: {
                id: tagIds,
                kanban: 1,
            },
        });
        // Remove the tagIds with kanban = 1 from TicketTags
        const tagIdsWithKanbanOne = tagsWithKanbanOne.map((tag) => tag.id);
        if (tagIdsWithKanbanOne)
            await TicketTag_1.default.destroy({ where: { ticketId, tagId: tagIdsWithKanbanOne } });
        const ticket = await (0, ShowTicketService_1.default)(ticketId, companyId);
        const io = (0, socket_1.getIO)();
        io.of(String(companyId))
            // .to(ticket.status)
            .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket
        });
        return res.status(200).json({ message: 'Ticket tags removed successfully.' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to remove ticket tags.' });
    }
};
exports.remove = remove;
