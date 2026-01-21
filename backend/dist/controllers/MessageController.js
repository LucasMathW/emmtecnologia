"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            }
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeAudioMessage =
  exports.sendMessageFlow =
  exports.storeTemplate =
  exports.edit =
  exports.send =
  exports.allMe =
  exports.remove =
  exports.forwardMessage =
  exports.store =
  exports.obterNomeEExtensaoDoArquivo =
  exports.index =
    void 0;
const AppError_1 = __importDefault(require("../errors/AppError"));
const SetTicketMessagesAsRead_1 = __importDefault(
  require("../helpers/SetTicketMessagesAsRead")
);
const socket_1 = require("../libs/socket");
const Message_1 = __importDefault(require("../models/Message"));
const Queue_1 = __importDefault(require("../models/Queue"));
const User_1 = __importDefault(require("../models/User"));
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const path_1 = __importDefault(require("path"));
const lodash_1 = require("lodash");
const async_mutex_1 = require("async-mutex");
const ListMessagesService_1 = __importDefault(
  require("../services/MessageServices/ListMessagesService")
);
const ShowTicketService_1 = __importDefault(
  require("../services/TicketServices/ShowTicketService")
);
const DeleteWhatsAppMessage_1 = __importDefault(
  require("../services/WbotServices/DeleteWhatsAppMessage")
);
const SendWhatsAppMedia_1 = __importDefault(
  require("../services/WbotServices/SendWhatsAppMedia")
);
const SendWhatsAppMessage_1 = __importDefault(
  require("../services/WbotServices/SendWhatsAppMessage")
);
const CreateMessageService_1 = __importDefault(
  require("../services/MessageServices/CreateMessageService")
);
const sendFacebookMessageMedia_1 = require("../services/FacebookServices/sendFacebookMessageMedia");
const sendFacebookMessage_1 = require("../services/FacebookServices/sendFacebookMessage");
const ShowPlanCompanyService_1 = __importDefault(
  require("../services/CompanyService/ShowPlanCompanyService")
);
const ListMessagesServiceAll_1 = __importDefault(
  require("../services/MessageServices/ListMessagesServiceAll")
);
const ShowContactService_1 = __importDefault(
  require("../services/ContactServices/ShowContactService")
);
const FindOrCreateTicketService_1 = __importDefault(
  require("../services/TicketServices/FindOrCreateTicketService")
);
const UpdateTicketService_1 = __importDefault(
  require("../services/TicketServices/UpdateTicketService")
);
const ShowMessageService_1 = __importStar(
  require("../services/MessageServices/ShowMessageService")
);
const CompaniesSettings_1 = __importDefault(
  require("../models/CompaniesSettings")
);
const facebookMessageListener_1 = require("../services/FacebookServices/facebookMessageListener");
const EditWhatsAppMessage_1 = __importDefault(
  require("../services/MessageServices/EditWhatsAppMessage")
);
const SendWhatsAppOficialMessage_1 = __importDefault(
  require("../services/WhatsAppOficial/SendWhatsAppOficialMessage")
);
const ShowService_1 = __importDefault(
  require("../services/QuickMessageService/ShowService")
);
const whatsAppOficial_service_1 = require("../libs/whatsAppOficial/whatsAppOficial.service");
const CheckNumber_1 = __importDefault(
  require("../services/WbotServices/CheckNumber")
);
const TranscribeAudioMessageService_1 = __importDefault(
  require("../services/MessageServices/TranscribeAudioMessageService")
);
const QuickMessage_1 = __importDefault(require("../models/QuickMessage"));
const QuickMessageComponent_1 = __importDefault(
  require("../models/QuickMessageComponent")
);
const index = async (req, res) => {
  const { ticketId } = req.params;
  const { pageNumber, selectedQueues: queueIdsStringified } = req.query;
  const { companyId, profile } = req.user;
  let queues = [];
  const user = await User_1.default.findByPk(req.user.id, {
    include: [{ model: Queue_1.default, as: "queues" }]
  });
  if (queueIdsStringified) {
    queues = JSON.parse(queueIdsStringified);
  } else {
    user.queues.forEach(queue => {
      queues.push(queue.id);
    });
  }
  const { count, messages, ticket, hasMore } = await (0,
  ListMessagesService_1.default)({
    pageNumber,
    ticketId,
    companyId,
    queues,
    user
  });
  if (
    ["whatsapp", "whatsapp_oficial"].includes(ticket.channel) &&
    ticket.whatsappId
  ) {
    (0, SetTicketMessagesAsRead_1.default)(ticket);
  }
  return res.json({ count, messages, ticket, hasMore });
};
exports.index = index;
function obterNomeEExtensaoDoArquivo(url) {
  var urlObj = new URL(url);
  var pathname = urlObj.pathname;
  var filename = pathname.split("/").pop();
  var parts = filename.split(".");
  var nomeDoArquivo = parts[0];
  var extensao = parts[1];
  return `${nomeDoArquivo}.${extensao}`;
}
exports.obterNomeEExtensaoDoArquivo = obterNomeEExtensaoDoArquivo;
// ✅ CORREÇÃO: Função melhorada para detectar arquivos de áudio
const isAudioFile = media => {
  console.log("🔍 Verificando se é áudio:", {
    originalname: media.originalname,
    mimetype: media.mimetype,
    fieldname: media.fieldname
  });
  // 1. Verificar se foi enviado pelo campo de áudio (resposta rápida)
  if (media.fieldname === "audio") {
    console.log("✅ Detectado como áudio pelo fieldname");
    return true;
  }
  // 2. Verificar mimetype
  if (media.mimetype && media.mimetype.startsWith("audio/")) {
    console.log("✅ Detectado como áudio pelo mimetype:", media.mimetype);
    return true;
  }
  // 3. Verificar extensão do arquivo
  if (media.originalname) {
    const audioExtensions = [
      ".mp3",
      ".ogg",
      ".wav",
      ".webm",
      ".m4a",
      ".aac",
      ".opus"
    ];
    const extension = path_1.default.extname(media.originalname).toLowerCase();
    if (audioExtensions.includes(extension)) {
      console.log("✅ Detectado como áudio pela extensão:", extension);
      return true;
    }
  }
  // 4. Verificar padrões no nome do arquivo
  if (
    media.originalname &&
    (media.originalname.includes("audio_") ||
      media.originalname.includes("áudio") ||
      media.originalname.includes("voice"))
  ) {
    console.log("✅ Detectado como áudio pelo padrão do nome");
    return true;
  }
  console.log("❌ Não detectado como áudio");
  return false;
};
const store = async (req, res) => {
  const { ticketId } = req.params;
  const { body, quotedMsg, vCard, isPrivate = "false" } = req.body;
  const medias = req.files;
  const { companyId } = req.user;
  const ticket = await (0, ShowTicketService_1.default)(ticketId, companyId);
  if (!ticket.whatsappId) {
    throw new AppError_1.default(
      "Este ticket não possui conexão vinculada, provavelmente foi excluída a conexão.",
      400
    );
  }
  (0, SetTicketMessagesAsRead_1.default)(ticket);
  try {
    if (medias) {
      await Promise.all(
        medias.map(async (media, index) => {
          console.log(`🔍 Processando mídia ${index + 1}:`, {
            originalname: media.originalname,
            mimetype: media.mimetype,
            fieldname: media.fieldname,
            size: media.size
          });
          // ✅ CORREÇÃO: Verificação melhorada para áudio
          if (isAudioFile(media)) {
            console.log("🎵 Processando como arquivo de áudio");
          } else {
            console.log("📎 Processando como arquivo comum");
          }
          if (ticket.channel === "whatsapp") {
            await (0, SendWhatsAppMedia_1.default)({
              media,
              ticket,
              body: Array.isArray(body) ? body[index] : body,
              isPrivate: isPrivate === "true",
              isForwarded: false
            });
          }
          if (ticket.channel == "whatsapp_oficial") {
            await (0, SendWhatsAppOficialMessage_1.default)({
              media,
              body: Array.isArray(body) ? body[index] : body,
              ticket,
              type: null,
              quotedMsg
            });
          }
          if (["facebook", "instagram"].includes(ticket.channel)) {
            try {
              const sentMedia = await (0,
              sendFacebookMessageMedia_1.sendFacebookMessageMedia)({
                media,
                ticket,
                body: Array.isArray(body) ? body[index] : body
              });
              if (ticket.channel === "facebook") {
                await (0, facebookMessageListener_1.verifyMessageMedia)(
                  sentMedia,
                  ticket,
                  ticket.contact,
                  true
                );
              }
            } catch (error) {
              console.log(error);
            }
          }
          // ✅ CORREÇÃO: Limpar arquivo após envio (exceto para privadas)
          // if (isPrivate === "false") {
          //   const filePath = path.resolve("public", `company${companyId}`, media.filename);
          //   const fileExists = fs.existsSync(filePath);
          //   if (fileExists) {
          //     try {
          //       // fs.unlinkSync(filePath);
          //       // console.log("🗑️ Arquivo temporário removido:", filePath);
          //     } catch (unlinkError) {
          //       console.warn("⚠️ Erro ao remover arquivo temporário:", unlinkError);
          //     }
          //   }
          // }
        })
      );
    } else {
      // Tratamento para mensagens sem mídia (código existente)
      if (ticket.channel === "whatsapp" && isPrivate === "false") {
        await (0, SendWhatsAppMessage_1.default)({
          body,
          ticket,
          quotedMsg,
          vCard
        });
      } else if (
        ticket.channel == "whatsapp_oficial" &&
        isPrivate === "false"
      ) {
        // Suporte a seleção manual de template via templateId/variables no envio padrão
        const { templateId, variables, bodyToSave } = req.body || {};
        if (templateId) {
          const template = await (0, ShowService_1.default)(
            templateId,
            companyId
          );
          if (!template) {
            throw new AppError_1.default("Template não encontrado", 400);
          }
          let templateData = {
            name: template.shortcode,
            language: { code: template.language }
          };
          let buttonsToSave = [];
          if (variables && Object.keys(variables).length > 0) {
            templateData = {
              name: template.shortcode,
              language: { code: template.language }
            };
            if (
              Array.isArray(template.components) &&
              template.components.length > 0
            ) {
              template.components.forEach((component, index) => {
                const componentType = component.type.toLowerCase();
                if (
                  variables[componentType] &&
                  Object.keys(variables[componentType]).length > 0
                ) {
                  let newComponent;
                  if (componentType.replace("buttons", "button") === "button") {
                    const buttons = JSON.parse(component.buttons);
                    buttons.forEach((button, btnIndex) => {
                      const subButton = Object.values(variables[componentType]);
                      subButton.forEach(sub => {
                        if (sub.buttonIndex === btnIndex) {
                          const buttonType = button.type;
                          newComponent = {
                            type: componentType.replace("buttons", "button"),
                            sub_type: buttonType,
                            index: btnIndex,
                            parameters: []
                          };
                        }
                      });
                    });
                  } else {
                    newComponent = {
                      type: componentType,
                      parameters: []
                    };
                  }
                  if (newComponent) {
                    Object.keys(variables[componentType]).forEach(key => {
                      if (
                        componentType.replace("buttons", "button") === "button"
                      ) {
                        if (newComponent?.sub_type === "COPY_CODE") {
                          newComponent.parameters.push({
                            type: "coupon_code",
                            coupon_code: variables[componentType][key].value
                          });
                        } else {
                          newComponent.parameters.push({
                            type: "text",
                            text: variables[componentType][key].value
                          });
                        }
                      } else {
                        if (template.components[index].format === "IMAGE") {
                          newComponent.parameters.push({
                            type: "image",
                            image: { link: variables[componentType][key].value }
                          });
                        } else {
                          const variableValue =
                            variables[componentType][key].value;
                          newComponent.parameters.push({
                            type: "text",
                            text: variableValue
                          });
                        }
                      }
                    });
                  }
                  if (!Array.isArray(templateData.components)) {
                    templateData.components = [];
                  }
                  templateData.components.push(newComponent);
                }
              });
            }
          }
          if (template.components.length > 0) {
            for (const component of template.components) {
              if (component.type === "BUTTONS") {
                buttonsToSave.push(component.buttons);
              }
            }
          }
          const finalBody = bodyToSave
            ? String(bodyToSave).concat("||||", JSON.stringify(buttonsToSave))
            : body;
          (0, SetTicketMessagesAsRead_1.default)(ticket);
          await (0, SendWhatsAppOficialMessage_1.default)({
            body: finalBody,
            ticket,
            quotedMsg,
            type: "template",
            media: null,
            template: templateData
          });
          return res.send();
        }
        // Regras Meta: fora da janela 24h ou primeira interação -> exige template
        const now = new Date();
        const lastInbound = await Message_1.default.findOne({
          where: { ticketId: ticket.id, companyId, fromMe: false },
          order: [["createdAt", "DESC"]]
        });
        const hasInbound = !!lastInbound;
        const within24h = hasInbound
          ? now.getTime() - new Date(lastInbound.createdAt).getTime() <
            24 * 60 * 60 * 1000
          : false;
        if (!(0, lodash_1.isNil)(vCard)) {
          // envio de contato permitido
          await (0, SendWhatsAppOficialMessage_1.default)({
            body,
            ticket,
            quotedMsg,
            type: "contacts",
            media: null,
            vCard
          });
        } else if (within24h) {
          // dentro da janela de 24h: texto normal
          // AUTO-DETECT: Se o body corresponde a uma QuickMessage oficial com botões, enviar como template
          const matchedQuickMessage = await QuickMessage_1.default.findOne({
            where: {
              companyId,
              isOficial: true,
              status: "APPROVED",
              message: body
            },
            include: [
              { model: QuickMessageComponent_1.default, as: "components" }
            ]
          });
          if (matchedQuickMessage) {
            const hasButtons = matchedQuickMessage.components?.some(
              c => (c.type || "").toUpperCase() === "BUTTONS"
            );
            if (hasButtons) {
              console.log(
                "[WABA] Auto-detect: QuickMessage oficial com botões detectada, enviando como template"
              );
              const templateData = {
                name: matchedQuickMessage.shortcode,
                language: { code: matchedQuickMessage.language || "pt_BR" }
              };
              let buttonsToSave = [];
              for (const comp of matchedQuickMessage.components || []) {
                if ((comp.type || "").toUpperCase() === "BUTTONS") {
                  buttonsToSave.push(comp.buttons);
                }
              }
              const finalBody = body.concat(
                "||||",
                JSON.stringify(buttonsToSave)
              );
              (0, SetTicketMessagesAsRead_1.default)(ticket);
              await (0, SendWhatsAppOficialMessage_1.default)({
                body: finalBody,
                ticket,
                quotedMsg,
                type: "template",
                media: null,
                template: templateData
              });
              return res.send();
            }
          }
          await (0, SendWhatsAppOficialMessage_1.default)({
            body,
            ticket,
            quotedMsg,
            type: "text",
            media: null
          });
        } else {
          // fora da janela / inicia conversa: tentar template de fallback com variável no BODY para enviar a mensagem do atendente
          const approvedTemplates = await QuickMessage_1.default.findAll({
            where: {
              whatsappId: ticket.whatsappId,
              isOficial: true,
              status: "APPROVED"
            },
            include: [
              { model: QuickMessageComponent_1.default, as: "components" }
            ],
            order: [["updatedAt", "DESC"]]
          });
          let templateForFreeText = null;
          // Preferir template marcado como principal (isStarter)
          const starterTemplate = await QuickMessage_1.default.findOne({
            where: {
              whatsappId: ticket.whatsappId,
              isOficial: true,
              status: "APPROVED",
              isStarter: true
            },
            include: [
              { model: QuickMessageComponent_1.default, as: "components" }
            ]
          });
          if (starterTemplate) {
            templateForFreeText = starterTemplate;
          }
          // Se não houver template inicial marcado (isStarter), procurar fallback
          if (!templateForFreeText) {
            for (const tmpl of approvedTemplates) {
              const components = Array.isArray(tmpl.components)
                ? tmpl.components
                : [];
              let requiresHeaderMedia = false;
              let requiresButtonParam = false;
              let bodyHasVariable = false;
              let bodyVarCount = 0;
              components.forEach(comp => {
                const type = (comp?.type || "").toUpperCase();
                const format = (comp?.format || "").toUpperCase();
                const text = comp?.text || "";
                let exampleObj = null;
                let buttonsArr = [];
                try {
                  if (comp?.example) exampleObj = JSON.parse(comp.example);
                } catch {}
                try {
                  if (comp?.buttons)
                    buttonsArr = JSON.parse(comp.buttons) || [];
                } catch {}
                if (type === "HEADER") {
                  if (["IMAGE", "VIDEO", "DOCUMENT"].includes(format))
                    requiresHeaderMedia = true;
                }
                if (type === "BODY") {
                  if (text.includes("{{")) {
                    bodyHasVariable = true;
                    bodyVarCount = Math.max(
                      bodyVarCount,
                      (text.match(/{{/g) || []).length
                    );
                  }
                  const exBody = Array.isArray(exampleObj?.body_text?.[0])
                    ? exampleObj.body_text[0]
                    : [];
                  if (exBody.length > 0) {
                    bodyHasVariable = true;
                    bodyVarCount = Math.max(bodyVarCount, exBody.length);
                  }
                }
                if (type === "BUTTONS") {
                  buttonsArr.forEach(btn => {
                    const btnType = (btn?.type || "").toUpperCase();
                    const hasExample =
                      btn?.example || btn?.text?.includes?.("{{");
                    if (btnType === "URL" && hasExample)
                      requiresButtonParam = true;
                  });
                }
              });
              if (
                bodyHasVariable &&
                [1, 2].includes(bodyVarCount) &&
                !requiresHeaderMedia &&
                !requiresButtonParam
              ) {
                templateForFreeText = tmpl;
                break;
              }
            }
          }
          if (!templateForFreeText) {
            console.log(
              "[WABA] Nenhum template com variável no BODY encontrado. Vou solicitar/usar o template fixo 'modelo_atendimento'."
            );
            // Solicitar criação do template fixo com variável no BODY
            try {
              const whats = await Whatsapp_1.default.findByPk(
                ticket.whatsappId
              );
              if (whats?.token) {
                await (0,
                whatsAppOficial_service_1.createFreeTextTemplateWhatsAppOficial)(
                  whats.token,
                  "modelo_atendimento"
                );
                console.log(
                  "[WABA] Template fixo 'modelo_atendimento' solicitado para criação na Meta (aguardando aprovação)."
                );
              } else {
                console.log(
                  "[WABA] Não foi possível resolver o token do WhatsApp para solicitar criação do template fixo."
                );
              }
            } catch (err) {
              console.log(
                `[WABA] Falha ao solicitar criação do template fixo: ${String(
                  err?.message || err
                )}`
              );
            }
            throw new AppError_1.default(
              "Nenhum template aprovado com variável no BODY foi encontrado. Solicitei a criação do template fixo 'modelo_atendimento' na Meta. Aguarde a aprovação e sincronize os templates para habilitar o envio como template.",
              400
            );
          }
          // Sanitização para parâmetro de template: sem \n, \t e sem espaços excessivos
          const sanitizeTemplateParamText = input => {
            if (!input) return "";
            return input
              .replace(/[\r\n\t]+/g, " ") // remove quebra de linha e tabs
              .replace(/\s{2,}/g, " ") // colapsa múltiplos espaços
              .trim()
              .slice(0, 1024);
          };
          // Verificar número de variáveis no BODY do template selecionado
          const selectedComponents = Array.isArray(
            templateForFreeText.components
          )
            ? templateForFreeText.components
            : [];
          let selectedBodyVarCount = 0;
          selectedComponents.forEach(comp => {
            const type = (comp?.type || "").toUpperCase();
            const text = comp?.text || "";
            let exampleObj = null;
            try {
              if (comp?.example) exampleObj = JSON.parse(comp.example);
            } catch {}
            if (type === "BODY") {
              if (text.includes("{{"))
                selectedBodyVarCount = Math.max(
                  selectedBodyVarCount,
                  (text.match(/{{/g) || []).length
                );
              const exBody = Array.isArray(exampleObj?.body_text?.[0])
                ? exampleObj.body_text[0]
                : [];
              if (exBody.length > 0)
                selectedBodyVarCount = Math.max(
                  selectedBodyVarCount,
                  exBody.length
                );
            }
          });
          const templateData = {
            name: templateForFreeText.shortcode,
            language: { code: templateForFreeText.language }
          };
          if (selectedBodyVarCount === 1) {
            templateData.components = [
              {
                type: "body",
                parameters: [
                  { type: "text", text: sanitizeTemplateParamText(body || "") }
                ]
              }
            ];
          } else if (selectedBodyVarCount === 2) {
            // Obter nome do atendente para {{1}}
            let attendantName = "";
            try {
              const attendant = await User_1.default.findByPk(req.user.id);
              attendantName = attendant?.name || req.user?.username || "";
            } catch {}
            templateData.components = [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: sanitizeTemplateParamText(attendantName)
                  },
                  { type: "text", text: sanitizeTemplateParamText(body || "") }
                ]
              }
            ];
          }
          console.log(
            `[WABA] Envio inicial via Template '${templateData.name}'${
              selectedBodyVarCount === 2
                ? " com nome do atendente e texto"
                : selectedBodyVarCount === 1
                ? " com texto do atendente"
                : ""
            } (lang=${templateData.language.code})`
          );
          await (0, SendWhatsAppOficialMessage_1.default)({
            body,
            ticket,
            quotedMsg,
            type: "template",
            template: templateData,
            media: null
          });
        }
      } else if (isPrivate === "true") {
        const messageData = {
          wid: `PVT${ticket.updatedAt.toString().replace(" ", "")}`,
          ticketId: ticket.id,
          contactId: undefined,
          body,
          fromMe: true,
          mediaType: !(0, lodash_1.isNil)(vCard)
            ? "contactMessage"
            : "extendedTextMessage",
          read: true,
          quotedMsgId: null,
          ack: 2,
          remoteJid: ticket.contact?.remoteJid,
          participant: null,
          dataJson: null,
          ticketTrakingId: null,
          isPrivate: isPrivate === "true"
        };
        await (0, CreateMessageService_1.default)({
          messageData,
          companyId: ticket.companyId
        });
      } else if (
        ["facebook", "instagram"].includes(ticket.channel) &&
        isPrivate === "false"
      ) {
        const sendText = await (0, sendFacebookMessage_1.sendFacebookMessage)({
          body,
          ticket,
          quotedMsg
        });
        if (ticket.channel === "facebook") {
          await (0, facebookMessageListener_1.verifyMessageFace)(
            sendText,
            body,
            ticket,
            ticket.contact,
            true
          );
        }
      }
    }
    return res.send();
  } catch (error) {
    console.error("❌ Erro no envio de mensagem:", error);
    return res.status(400).json({ error: error.message });
  }
};
exports.store = store;
const forwardMessage = async (req, res) => {
  const { quotedMsg, signMessage, messageId, contactId } = req.body;
  const { id: userId, companyId } = req.user;
  const requestUser = await User_1.default.findByPk(userId);
  if (!messageId || !contactId) {
    return res.status(200).send("MessageId or ContactId not found");
  }
  const message = await (0, ShowMessageService_1.default)(messageId);
  const contact = await (0, ShowContactService_1.default)(contactId, companyId);
  if (!message) {
    return res.status(404).send("Message not found");
  }
  if (!contact) {
    return res.status(404).send("Contact not found");
  }
  const settings = await CompaniesSettings_1.default.findOne({
    where: { companyId }
  });
  const whatsAppConnectionId = await (0,
  ShowMessageService_1.GetWhatsAppFromMessage)(message);
  if (!whatsAppConnectionId) {
    return res.status(404).send("Whatsapp from message not found");
  }
  const ticket = await (0, ShowTicketService_1.default)(
    message.ticketId,
    message.companyId
  );
  const mutex = new async_mutex_1.Mutex();
  const createTicket = await mutex.runExclusive(async () => {
    const result = await (0, FindOrCreateTicketService_1.default)(
      contact,
      ticket?.whatsapp,
      0,
      ticket.companyId,
      ticket.queueId,
      requestUser.id,
      contact.isGroup ? contact : null,
      ticket.channel,
      null,
      true,
      settings,
      false,
      false
    );
    return result;
  });
  let ticketData;
  if ((0, lodash_1.isNil)(createTicket?.queueId)) {
    ticketData = {
      status: createTicket.isGroup ? "group" : "open",
      userId: requestUser.id,
      queueId: ticket.queueId
    };
  } else {
    ticketData = {
      status: createTicket.isGroup ? "group" : "open",
      userId: requestUser.id
    };
  }
  await (0, UpdateTicketService_1.default)({
    ticketData,
    ticketId: createTicket.id,
    companyId: createTicket.companyId
  });
  let body = message.body;
  if (
    message.mediaType === "conversation" ||
    message.mediaType === "extendedTextMessage" ||
    message.mediaType === "text" ||
    message.mediaType === "location" ||
    message.mediaType === "contactMessage" ||
    message.mediaType === "interactive"
  ) {
    if (ticket.channel === "whatsapp") {
      await (0, SendWhatsAppMessage_1.default)({
        body,
        ticket: createTicket,
        quotedMsg,
        isForwarded: message.fromMe ? false : true
      });
    }
    if (ticket.channel === "whatsapp_oficial") {
      await (0, SendWhatsAppOficialMessage_1.default)({
        body: `_Mensagem encaminhada_:\n ${body}`,
        ticket: createTicket,
        quotedMsg,
        type: "text",
        media: null
      });
    }
  } else {
    const mediaUrl = message.mediaUrl.replace(`:${process.env.PORT}`, "");
    const fileName = obterNomeEExtensaoDoArquivo(mediaUrl);
    if (body === fileName) {
      body = "";
    }
    const publicFolder = path_1.default.join(
      __dirname,
      "..",
      "..",
      "..",
      "backend",
      "public"
    );
    const filePath = path_1.default.join(
      publicFolder,
      `company${createTicket.companyId}`,
      fileName
    );
    const mediaSrc = {
      fieldname: "medias",
      originalname: fileName,
      encoding: "7bit",
      mimetype: message.mediaType,
      filename: fileName,
      path: filePath
    };
    if (ticket.channel === "whatsapp") {
      await (0, SendWhatsAppMedia_1.default)({
        media: mediaSrc,
        ticket: createTicket,
        body,
        isForwarded: message.fromMe ? false : true
      });
    }
    if (ticket.channel === "whatsapp_oficial") {
      await (0, SendWhatsAppOficialMessage_1.default)({
        body: `_Mensagem encaminhada_:\n ${body}`,
        ticket: createTicket,
        quotedMsg,
        type: null,
        media: mediaSrc
      });
    }
  }
  return res.send();
};
exports.forwardMessage = forwardMessage;
const remove = async (req, res) => {
  const { messageId } = req.params;
  const { companyId } = req.user;
  const message = await (0, DeleteWhatsAppMessage_1.default)(
    messageId,
    companyId
  );
  const io = (0, socket_1.getIO)();
  if (message.isPrivate) {
    await Message_1.default.destroy({
      where: {
        id: message.id
      }
    });
    io.of(String(companyId))
      // .to(message.ticketId.toString())
      .emit(`company-${companyId}-appMessage`, {
        action: "delete",
        message
      });
  }
  io.of(String(companyId))
    // .to(message.ticketId.toString())
    .emit(`company-${companyId}-appMessage`, {
      action: "update",
      message
    });
  return res.send();
};
exports.remove = remove;
const allMe = async (req, res) => {
  const dateStart = req.query.dateStart;
  const dateEnd = req.query.dateEnd;
  const fromMe = req.query.fromMe;
  const { companyId } = req.user;
  const { count } = await (0, ListMessagesServiceAll_1.default)({
    companyId,
    fromMe,
    dateStart,
    dateEnd
  });
  return res.json({ count });
};
exports.allMe = allMe;
const send = async (req, res) => {
  const messageData = req.body;
  const medias = req.files;
  try {
    const authHeader = req.headers.authorization;
    const [, token] = authHeader.split(" ");
    const whatsapp = await Whatsapp_1.default.findOne({ where: { token } });
    const companyId = whatsapp.companyId;
    const company = await (0, ShowPlanCompanyService_1.default)(companyId);
    const sendMessageWithExternalApi = company.plan.useExternalApi;
    if (sendMessageWithExternalApi) {
      if (!whatsapp) {
        throw new Error("Não foi possível realizar a operação");
      }
      if (messageData.number === undefined) {
        throw new Error("O número é obrigatório");
      }
      const number = messageData.number;
      const body = messageData.body;
      if (medias) {
        await Promise.all(
          medias.map(async media => {
            req.app.get("queues").messageQueue.add(
              "SendMessage",
              {
                whatsappId: whatsapp.id,
                data: {
                  number,
                  body: media.originalname.replace("/", "-"),
                  mediaPath: media.path
                }
              },
              { removeOnComplete: true, attempts: 3 }
            );
          })
        );
      } else {
        req.app.get("queues").messageQueue.add(
          "SendMessage",
          {
            whatsappId: whatsapp.id,
            data: {
              number,
              body
            }
          },
          { removeOnComplete: true, attempts: 3 }
        );
      }
      return res.send({ mensagem: "Mensagem enviada!" });
    }
    return res
      .status(400)
      .json({
        error:
          "Essa empresa não tem permissão para usar a API Externa. Entre em contato com o Suporte para verificar nossos planos!"
      });
  } catch (err) {
    console.log(err);
    if (Object.keys(err).length === 0) {
      throw new AppError_1.default(
        "Não foi possível enviar a mensagem, tente novamente em alguns instantes"
      );
    } else {
      throw new AppError_1.default(err.message);
    }
  }
};
exports.send = send;
const edit = async (req, res) => {
  const { messageId } = req.params;
  const { companyId } = req.user;
  const { body } = req.body;
  const { ticket, message } = await (0, EditWhatsAppMessage_1.default)({
    messageId,
    body
  });
  const io = (0, socket_1.getIO)();
  io.of(String(companyId))
    // .to(String(ticket.id))
    .emit(`company-${companyId}-appMessage`, {
      action: "update",
      message
    });
  io.of(String(companyId))
    // .to(ticket.status)
    // .to("notification")
    // .to(String(ticket.id))
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });
  return res.send();
};
exports.edit = edit;
const storeTemplate = async (req, res) => {
  const { ticketId } = req.params;
  const { quotedMsg, templateId, variables, bodyToSave } = req.body;
  const medias = req.files;
  const { companyId } = req.user;
  const ticket = await (0, ShowTicketService_1.default)(ticketId, companyId);
  const template = await (0, ShowService_1.default)(templateId, companyId);
  if (!template) {
    throw new Error("Template not found");
  }
  let templateData = {
    name: template.shortcode,
    language: {
      code: template.language
    }
  };
  let buttonsToSave = [];
  if (Object.keys(variables).length > 0) {
    templateData = {
      name: template.shortcode,
      language: {
        code: template.language
      }
    };
    if (Array.isArray(template.components) && template.components.length > 0) {
      template.components.forEach((component, index) => {
        const componentType = component.type.toLowerCase();
        // Verifique se há variáveis para o componente atual
        if (
          variables[componentType] &&
          Object.keys(variables[componentType]).length > 0
        ) {
          let newComponent;
          if (componentType.replace("buttons", "button") === "button") {
            const buttons = JSON.parse(component.buttons);
            buttons.forEach((button, index) => {
              const subButton = Object.values(variables[componentType]);
              subButton.forEach((sub, indexSub) => {
                // Verifica se o buttonIndex corresponde ao button.index
                if (sub.buttonIndex === index) {
                  const buttonType = button.type;
                  newComponent = {
                    type: componentType.replace("buttons", "button"),
                    sub_type: buttonType,
                    index: index,
                    parameters: []
                  };
                }
              });
            });
          } else {
            newComponent = {
              type: componentType,
              parameters: []
            };
          }
          if (newComponent) {
            Object.keys(variables[componentType]).forEach(key => {
              if (componentType.replace("buttons", "button") === "button") {
                if (newComponent?.sub_type === "COPY_CODE") {
                  newComponent.parameters.push({
                    type: "coupon_code",
                    coupon_code: variables[componentType][key].value
                  });
                } else {
                  newComponent.parameters.push({
                    type: "text",
                    text: variables[componentType][key].value
                  });
                }
              } else {
                if (template.components[index].format === "IMAGE") {
                  newComponent.parameters.push({
                    type: "image",
                    image: {
                      link: variables[componentType][key].value
                    }
                  });
                } else {
                  const variableValue = variables[componentType][key].value;
                  newComponent.parameters.push({
                    type: "text",
                    text: variableValue
                  });
                }
              }
            });
          }
          if (!Array.isArray(templateData.components)) {
            templateData.components = [];
          }
          templateData.components.push(newComponent);
        }
      });
    }
  }
  if (template.components.length > 0) {
    for (const component of template.components) {
      if (component.type === "BUTTONS") {
        buttonsToSave.push(component.buttons);
      }
    }
  }
  console.log(JSON.stringify(templateData, null, 2));
  const newBodyToSave = bodyToSave.concat(
    "||||",
    JSON.stringify(buttonsToSave)
  );
  if (["whatsapp_oficial"].includes(ticket.channel) && ticket.whatsappId) {
    (0, SetTicketMessagesAsRead_1.default)(ticket);
  }
  try {
    if (ticket.channel == "whatsapp_oficial") {
      await (0, SendWhatsAppOficialMessage_1.default)({
        body: newBodyToSave,
        ticket,
        quotedMsg,
        type: "template",
        media: null,
        template: templateData
      });
    }
    return res.send(200);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  }
};
exports.storeTemplate = storeTemplate;
const sendMessageFlow = async (whatsappId, body, req, files) => {
  const messageData = body;
  const medias = files;
  try {
    const whatsapp = await Whatsapp_1.default.findByPk(whatsappId);
    if (!whatsapp) {
      throw new Error("Não foi possível realizar a operação");
    }
    if (messageData.number === undefined) {
      throw new Error("O número é obrigatório");
    }
    const numberToTest = messageData.number;
    const body = messageData.body;
    const companyId = messageData.companyId;
    const CheckValidNumber = await (0, CheckNumber_1.default)(
      numberToTest,
      companyId
    );
    const number = CheckValidNumber.jid.split("@")[0];
    if (medias) {
      await Promise.all(
        medias.map(async media => {
          await req.app.get("queues").messageQueue.add(
            "SendMessage",
            {
              whatsappId,
              data: {
                number,
                body: media.originalname,
                mediaPath: media.path
              }
            },
            { removeOnComplete: true, attempts: 3 }
          );
        })
      );
    } else {
      req.app.get("queues").messageQueue.add(
        "SendMessage",
        {
          whatsappId,
          data: {
            number,
            body
          }
        },
        { removeOnComplete: false, attempts: 3 }
      );
    }
    return "Mensagem enviada";
  } catch (err) {
    if (Object.keys(err).length === 0) {
      throw new AppError_1.default(
        "Não foi possível enviar a mensagem, tente novamente em alguns instantes"
      );
    } else {
      throw new AppError_1.default(err.message);
    }
  }
};
exports.sendMessageFlow = sendMessageFlow;
const transcribeAudioMessage = async (req, res) => {
  const { companyId } = req.user;
  const { wid } = req.body;
  const transcribedText = await (0, TranscribeAudioMessageService_1.default)(
    wid,
    companyId.toString()
  );
  return res.send(transcribedText);
};
exports.transcribeAudioMessage = transcribeAudioMessage;
