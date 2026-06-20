// src/services/ContactServices/CreateOrUpdateContactService.ts - CORRIGIDO
import { getIO } from "../../libs/socket";
import CompaniesSettings from "../../models/CompaniesSettings";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import fs from "fs";
const fsp = fs.promises;
import path, { join } from "path";
import logger from "../../utils/logger";
import { isNil } from "lodash";
import Whatsapp from "../../models/Whatsapp";
import * as Sentry from "@sentry/node";
import { ENABLE_LID_DEBUG } from "../../config/debug";
import { normalizeJid } from "../../utils";
const axios = require("axios");
import { getContactMutex } from "../../libs/ContactMutex";
import { setCachedContact } from "../../libs/ContactCache";

interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  birthDate?: Date | string;
  profilePicUrl?: string;
  companyId: number;
  channel?: string;
  extraInfo?: ExtraInfo[];
  remoteJid?: string;
  lid?: string;
  whatsappId?: number;
  wbot?: any;
  fromMe?: boolean;
}

interface ContactData {
  name?: string;
  number?: string;
  isGroup?: boolean;
  email?: string;
  profilePicUrl?: string;
  companyId?: number;
  extraInfo?: ExtraInfo[];
  channel?: string;
  disableBot?: boolean;
  language?: string;
  lid?: string;
}

export const updateContact = async (
  contact: Contact,
  contactData: ContactData
) => {
  // Se uma nova profilePicUrl válida foi passada, baixar a imagem pro disco
  const newProfilePicUrl = contactData.profilePicUrl;

  if (!newProfilePicUrl || newProfilePicUrl.includes("nopicture")) {
    return contact;
  }

  if (newProfilePicUrl && !newProfilePicUrl.includes("nopicture")) {
    contact.profilePicUrl = newProfilePicUrl;

    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
    const folder = path.resolve(
      publicFolder,
      `company${contact.companyId}`,
      "contacts"
    );

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
      fs.chmodSync(folder, 0o777);
    }

    const filename = `${contact.id}.jpeg`;
    const filePath = path.join(folder, filename);

    // Remove arquivo antigo se diferente
    const oldUrl = contact.urlPicture;
    if (oldUrl && oldUrl !== filename && !oldUrl.includes("nopicture")) {
      const oldBase = oldUrl.replace(/\\/g, "/").split("/").pop();
      if (oldBase) {
        const oldFile = path.join(folder, oldBase);
        if (fs.existsSync(oldFile)) {
          fs.unlinkSync(oldFile);
        }
      }
    }

    try {
      const response = await axios.get(newProfilePicUrl, {
        responseType: "arraybuffer"
      });
      fs.writeFileSync(filePath, response.data);
      contact.setDataValue("urlPicture", filename);
      contact.pictureUpdated = true;
    } catch (e) {
      logger.error(
        `[PIC-UPDATE] Erro ao baixar foto para contato ${contact.number}: ${e.message}`
      );
    }
  }

  await contact.save();
  await contact.reload();

  const io = getIO();
  io.of(String(contact.companyId)).emit(
    `company-${contact.companyId}-contact`,
    {
      action: "update",
      contact: contact.toJSON()
    }
  );
  return contact;
};

const CreateOrUpdateContactService = async ({
  name,
  number,
  profilePicUrl,
  isGroup,
  email = "",
  birthDate = null,
  channel = "whatsapp",
  companyId,
  extraInfo = [],
  remoteJid = "",
  lid = "",
  whatsappId,
  wbot,
  fromMe = false
}: Request): Promise<Contact> => {
  const rawNumber = number.includes("@")
    ? number.substring(0, number.indexOf("@"))
    : number;

  return getContactMutex(companyId, rawNumber).runExclusive(async () => {
    try {
      let cleanNumber = number;
      if (!isGroup && cleanNumber.includes("@")) {
        cleanNumber = cleanNumber.substring(0, cleanNumber.indexOf("@"));
        logger.info(
          `[RDS-LID] Número com formato incorreto corrigido: ${number} -> ${cleanNumber}`
        );
      }

      const fallbackRemoteJid = normalizeJid(
        remoteJid ||
          (isGroup ? `${cleanNumber}@g.us` : `${cleanNumber}@s.whatsapp.net`)
      );

      let createContact = false;
      const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

      const io = getIO();
      let contact: Contact | null;

      if (ENABLE_LID_DEBUG) {
        logger.info(
          `[RDS-LID] Buscando contato: number=${cleanNumber}, companyId=${companyId}, lid=${lid}`
        );
      }

      if (lid) {
        contact = await Contact.findOne({ where: { lid, companyId } });
      }
      if (!contact) {
        contact = await Contact.findOne({
          where: { number: cleanNumber, companyId }
        });
      }

      let updateImage =
        ((!contact ||
          (contact?.profilePicUrl !== profilePicUrl && profilePicUrl !== "")) &&
          (wbot || ["instagram", "facebook"].includes(channel))) ||
        false;

      if (contact) {
        contact.remoteJid = fallbackRemoteJid;
        if (!contact.lid) {
          contact.lid = lid;
        }
        if (ENABLE_LID_DEBUG) {
          logger.info(`[RDS-LID] fromMe recebido: ${fromMe}`);
        }

        if (lid && lid !== "") {
          if (contact.lid !== lid) {
            if (ENABLE_LID_DEBUG) {
              logger.info(
                `[RDS-LID] Atualizando lid do contato: de='${contact.lid}' para='${lid}'`
              );
            }
            contact.lid = lid;
          }
        } else if (fromMe === false && contact.lid && fallbackRemoteJid) {
          if (wbot) {
            try {
              const ow = await wbot.onWhatsApp(fallbackRemoteJid);
              if (ow?.[0]?.exists && ow?.[0]?.lid) {
                const lidFromLookup = ow[0].lid as string;
                if (lidFromLookup && lidFromLookup !== contact.lid) {
                  if (ENABLE_LID_DEBUG) {
                    logger.info(
                      `[RDS-LID] Atualizando lid obtido via lookup: de='${contact.lid}' para='${lidFromLookup}'`
                    );
                  }
                  contact.lid = lidFromLookup;
                }
              }
            } catch (error) {
              if (ENABLE_LID_DEBUG) {
                logger.error(
                  `[RDS-LID] Erro ao consultar LID: ${error.message}`
                );
              }
            }
          }
        }

        // Só atualiza profilePicUrl no contato se vier um valor válido (não nopicture)
        // Se vier nopicture ou vazio, mantém o que estava antes para não sobrescrever
        if (profilePicUrl && !profilePicUrl.includes("nopicture")) {
          contact.profilePicUrl = profilePicUrl;
          updateImage = true; // forçar download da nova imagem
        } else if (!contact.profilePicUrl) {
          contact.profilePicUrl = profilePicUrl || null;
        }

        contact.isGroup = isGroup;

        // 🎂 ATUALIZAR DATA DE NASCIMENTO SE FORNECIDA
        if (birthDate !== null && birthDate !== undefined) {
          let processedBirthDate: Date | null = null;
          if (typeof birthDate === "string") {
            processedBirthDate = new Date(birthDate);
            if (!isNaN(processedBirthDate.getTime())) {
              contact.birthDate = processedBirthDate;
            }
          } else {
            contact.birthDate = birthDate;
          }
        }

        if (isNil(contact.whatsappId) && !isNil(whatsappId)) {
          const whatsapp = await Whatsapp.findOne({
            where: { id: whatsappId, companyId }
          });
          if (whatsapp) {
            contact.whatsappId = whatsappId;
          }
        }

        const folder = path.resolve(
          publicFolder,
          `company${companyId}`,
          "contacts"
        );

        // Verifica se já existe arquivo de foto salvo em disco
        let fileName: string | undefined;
        if (contact.urlPicture && !contact.urlPicture.includes("nopicture")) {
          const resolvedOld = contact.urlPicture.replace(/\\/g, "/");
          const baseName = resolvedOld.split("/").pop();
          if (baseName) {
            fileName = path.join(folder, baseName);
          }
        }

        const fileExistsAndValid = !!fileName && fs.existsSync(fileName);

        // Verifica se a foto atual (no banco) é inválida/nopicture
        const currentPicIsInvalid =
          !contact.urlPicture ||
          contact.urlPicture.includes("nopicture") ||
          !fileExistsAndValid;

        const isGroupContact = (
          contact.remoteJid || fallbackRemoteJid
        )?.includes("@g.us");

        // if (wbot && currentPicIsInvalid) {
        //   try {
        //     const targetJid = contact.remoteJid || fallbackRemoteJid;
        //     logger.info(
        //       `[PIC-DEBUG2] Tentando buscar foto para JID: ${targetJid}`
        //     );
        //     logger.info(
        //       `[PIC-DEBUG2] contact.urlPicture=${contact.urlPicture}`
        //     );
        //     logger.info(
        //       `[PIC-DEBUG2] fileExistsAndValid=${fileExistsAndValid}`
        //     );
        //     logger.info(
        //       `[PIC-DEBUG2] currentPicIsInvalid=${currentPicIsInvalid}`
        //     );
        //     logger.info(`[PIC-DEBUG2] fileName=${fileName}`);

        //     const fetched = await wbot.profilePictureUrl(targetJid, "image");

        //     logger.info(`[PIC-DEBUG2] fetched=${fetched}`);

        //     if (fetched && !fetched.includes("nopicture")) {
        //       profilePicUrl = fetched;
        //       contact.profilePicUrl = profilePicUrl;
        //       updateImage = true;
        //       logger.info(
        //         `[PIC] Foto obtida via wbot para contato ${contact.number}: ${profilePicUrl}`
        //       );
        //     } else {
        //       logger.info(
        //         `[PIC] wbot não retornou foto válida para ${contact.number}, mantendo estado atual`
        //       );
        //       // Não altera updateImage nem profilePicUrl — mantém o que tinha
        //     }
        //   } catch (e) {
        //     logger.info(
        //       `[PIC] Sem foto de perfil disponível para ${contact.number}: ${e.message}`
        //     );
        //     // Não altera updateImage — não força nopicture
        //   }
        // } else if (!wbot && currentPicIsInvalid) {
        //   // Sem wbot e sem foto válida: mantém o estado, não força nopicture
        //   logger.info(
        //     `[PIC] Sem wbot para buscar foto de ${contact.number}, mantendo estado atual`
        //   );
        // }
        // Se fileExistsAndValid === true: arquivo já existe em disco, não precisa rebaixar

        // 🔥 REFACTORED: Busca de foto em BACKGROUND (fire-and-forget)
        if (wbot && currentPicIsInvalid) {
          const targetJid = contact.remoteJid || fallbackRemoteJid;
          logger.info(
            `[PIC-BG] 🚀 Disparando busca de foto em background para JID: ${targetJid}`
          );
          logger.info(`[PIC-BG] contact.urlPicture=${contact.urlPicture}`);
          logger.info(`[PIC-BG] fileExistsAndValid=${fileExistsAndValid}`);
          logger.info(`[PIC-BG] currentPicIsInvalid=${currentPicIsInvalid}`);
          logger.info(`[PIC-BG] fileName=${fileName}`);

          // ✅ FIRE-AND-FORGET: Busca URL e baixa foto SEM bloquear o retorno
          (async () => {
            try {
              // 1. Busca URL da foto com timeout de 5s
              const fetched = await Promise.race([
                wbot.profilePictureUrl(targetJid, "image"),
                new Promise<null>(resolve =>
                  setTimeout(() => resolve(null), 5000)
                )
              ]);

              logger.info(`[PIC-BG] fetched=${fetched}`);

              if (fetched && !fetched.includes("nopicture")) {
                logger.info(
                  `[PIC-BG] ✅ URL obtida para ${contact.number}: ${fetched}`
                );

                // 2. Baixa a imagem com timeout de 8s
                const response = await axios.get(fetched, {
                  responseType: "arraybuffer",
                  timeout: 8000
                });

                // 3. Salva em disco (assíncrono)
                const filename = `${contact.id}.jpeg`;
                const filePath = path.join(folder, filename);
                await fsp.writeFile(filePath, response.data);
                logger.info(`[PIC-BG] 💾 Foto salva em disco: ${filePath}`);

                // 4. Atualiza o contato no banco
                await contact.update({
                  profilePicUrl: fetched,
                  urlPicture: filename,
                  pictureUpdated: true
                });

                // 5. Emite socket para atualizar UI em tempo real
                const io = getIO();
                io.of(String(companyId)).emit(`company-${companyId}-contact`, {
                  action: "update",
                  contact: contact.toJSON()
                });

                logger.info(
                  `[PIC-BG] ✅ Foto atualizada com sucesso para contato ${contact.number}`
                );
              } else {
                logger.info(
                  `[PIC-BG] ⚠️ wbot não retornou foto válida para ${contact.number}, mantendo estado atual`
                );
              }
            } catch (e) {
              logger.warn(
                `[PIC-BG] ⚠️ Sem foto de perfil disponível para ${contact.number}: ${e.message}`
              );
            }
          })().catch(err => {
            logger.error(`[PIC-BG] ❌ Erro não capturado: ${err.message}`);
          });

          // ⚠️ NÃO alteramos updateImage nem profilePicUrl aqui
          // O contato será retornado imediatamente sem a foto
        } else if (!wbot && currentPicIsInvalid) {
          // Sem wbot e sem foto válida: mantém o estado, não força nopicture
          logger.info(
            `[PIC] Sem wbot para buscar foto de ${contact.number}, mantendo estado atual`
          );
        }

        if (contact.name === number) {
          contact.name = name;
        }

        const isDirty = contact.changed();

        if (isDirty) {
          await contact.save();
          await contact.reload();
          setCachedContact(companyId, cleanNumber, contact);
        }
      } else if (["whatsapp"].includes(channel)) {
        const t0 = Date.now();
        logger.info(`[PERF] Iniciando bloco criação contato ${cleanNumber}`);
        const settings = await CompaniesSettings.findOne({
          where: { companyId }
        });
        const acceptAudioMessageContact = settings?.acceptAudioMessageContact;
        const newRemoteJid = fallbackRemoteJid;

        if (ENABLE_LID_DEBUG) {
          logger.info(
            `[RDS-LID] Criando novo contato: number=${number}, jid=${newRemoteJid}, lid=${lid}`
          );
        }

        // if (wbot) {
        //   console.log("=== INSPEÇÃO DO WBOT ===");
        //   console.log("Tipo:", typeof wbot);
        //   console.log("Chaves:", Object.keys(wbot));
        //   console.log("Prototype:", Object.getPrototypeOf(wbot));

        //   // Ver se profilePictureUrl existe
        //   console.log(
        //     "profilePictureUrl existe?",
        //     typeof wbot.profilePictureUrl
        //   );
        //   console.log(
        //     "profilePictureUrl é função?",
        //     typeof wbot.profilePictureUrl === "function"
        //   );

        //   // Ver outros métodos relacionados
        //   console.log(
        //     "Métodos disponíveis:",
        //     Object.getOwnPropertyNames(wbot).filter(
        //       key => typeof wbot[key] === "function"
        //     )
        //   );

        //   try {
        //     const t1 = Date.now();
        //     const fetched = await wbot.profilePictureUrl(newRemoteJid, "image");
        //     logger.info(`[PERF] profilePictureUrl levou ${Date.now() - t1}ms`);

        //     if (fetched && !fetched.includes("nopicture")) {
        //       profilePicUrl = fetched;
        //     } else {
        //       profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
        //     }
        //   } catch (e) {
        //     profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
        //   }
        // } else {
        //   profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
        // }

        // 🎂 PROCESSAR DATA DE NASCIMENTO PARA NOVO CONTATO

        profilePicUrl = null;

        let processedBirthDate: Date | null = null;
        if (birthDate) {
          if (typeof birthDate === "string") {
            processedBirthDate = new Date(birthDate);
            if (isNaN(processedBirthDate.getTime())) {
              processedBirthDate = null;
            }
          } else {
            processedBirthDate = birthDate;
          }
        }

        try {
          let lidToUse = lid || null;

          // if (!lidToUse && wbot && newRemoteJid) {
          //   const t2 = Date.now();
          //   try {
          //     const ow = await wbot.onWhatsApp(newRemoteJid);
          //     logger.info(`[PERF] onWhatsApp levou ${Date.now() - t2}ms`);
          //     if (ow?.[0]?.exists && ow?.[0]?.lid) {
          //       lidToUse = ow[0].lid as string;
          //       if (ENABLE_LID_DEBUG) {
          //         logger.info(
          //           `[RDS-LID] LID obtido via API para novo contato: ${lidToUse}`
          //         );
          //       }
          //     }
          //   } catch (error) {
          //     if (ENABLE_LID_DEBUG) {
          //       logger.error(
          //         `[RDS-LID] Erro ao consultar LID para novo contato: ${error.message}`
          //       );
          //     }
          //   }
          // }
          const t3 = Date.now();
          contact = await Contact.create({
            name,
            number: cleanNumber,
            email,
            birthDate: processedBirthDate,
            isGroup,
            companyId,
            channel,
            acceptAudioMessage:
              acceptAudioMessageContact === "enabled" ? true : false,
            remoteJid: normalizeJid(newRemoteJid),
            lid: lidToUse,
            profilePicUrl,
            urlPicture: "",
            whatsappId
          });

          logger.info(`[PERF] Contact.create levou ${Date.now() - t3}ms`);

          setCachedContact(companyId, cleanNumber, contact);

          if (ENABLE_LID_DEBUG) {
            logger.info(
              `[RDS-LID] Novo contato criado: id=${contact.id}, number=${contact.number}, jid=${contact.remoteJid}, lid=${contact.lid}`
            );
          }
          createContact = true;
          logger.info(`[PERF] Bloco criação total: ${Date.now() - t0}ms`);
        } catch (err) {
          if (err.name === "SequelizeUniqueConstraintError") {
            logger.info(
              `[RDS-CONTACT] Contato já existe, buscando e reativando: number=${number}, companyId=${companyId}`
            );

            contact = await Contact.findOne({
              where: { number, companyId }
            });

            if (contact) {
              if (!contact.active) {
                await contact.update({
                  active: true,
                  profilePicUrl,
                  remoteJid: normalizeJid(newRemoteJid),
                  lid: lid || null
                });
                logger.info(
                  `[RDS-CONTACT] Contato reativado: id=${contact.id}, number=${contact.number}`
                );
              }
            } else {
              logger.error(
                `[RDS-CONTACT] Erro de unicidade, mas contato não encontrado: ${err.message}`
              );
              throw err;
            }
          } else {
            logger.error(`[RDS-CONTACT] Erro ao criar contato: ${err.message}`);
            throw err;
          }
        }
      } else if (["facebook", "instagram"].includes(channel)) {
        // 🎂 PROCESSAR DATA DE NASCIMENTO PARA REDES SOCIAIS
        let processedBirthDate: Date | null = null;
        if (birthDate) {
          if (typeof birthDate === "string") {
            const dateOnly = birthDate.split("T")[0];
            const [year, month, day] = dateOnly.split("-").map(Number);
            processedBirthDate = new Date(year, month - 1, day, 12, 0, 0);
          } else if (birthDate instanceof Date) {
            const year = birthDate.getFullYear();
            const month = birthDate.getMonth();
            const day = birthDate.getDate();
            processedBirthDate = new Date(year, month, day, 12, 0, 0);
          }
        }

        try {
          contact = await Contact.create({
            name,
            number: cleanNumber,
            email,
            birthDate: processedBirthDate,
            isGroup,
            companyId,
            channel,
            profilePicUrl,
            urlPicture: "",
            whatsappId
          });
          setCachedContact(companyId, cleanNumber, contact);
          createContact = true;
        } catch (err) {
          if (err.name === "SequelizeUniqueConstraintError") {
            logger.info(
              `[RDS-CONTACT] Contato social já existe, buscando e reativando: number=${number}, companyId=${companyId}, canal=${channel}`
            );

            contact = await Contact.findOne({
              where: { number: cleanNumber, companyId, channel }
            });

            if (contact) {
              if (!contact.active) {
                await contact.update({ active: true, profilePicUrl });
                logger.info(
                  `[RDS-CONTACT] Contato social reativado: id=${contact.id}, number=${contact.number}, canal=${channel}`
                );
              }
            } else {
              logger.error(
                `[RDS-CONTACT] Erro de unicidade no contato social, mas contato não encontrado: ${err.message}`
              );
              throw err;
            }
          } else {
            logger.error(
              `[RDS-CONTACT] Erro ao criar contato social: ${err.message}`
            );
            throw err;
          }
        }
      }

      if (!contact) {
        throw new Error(
          "Não foi possível criar ou localizar o contato. Informe o número/canal corretamente."
        );
      }

      logger.info(`[PIC-NEW] PRE-SAVE updateImage=${updateImage}`);
      logger.info(`[PIC-NEW] PRE-SAVE profilePicUrl=${profilePicUrl}`);
      logger.info(`[PIC-NEW] PRE-SAVE contact.id=${contact?.id}`);
      logger.info(`[PIC-NEW] PRE-SAVE createContact=${createContact}`);

      if (updateImage) {
        const folder = path.resolve(
          publicFolder,
          `company${companyId}`,
          "contacts"
        );

        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder, { recursive: true });
          fs.chmodSync(folder, 0o777);
        }

        // ✅ Última chance: se ainda for nopicture mas tem wbot, tenta buscar a foto real
        const isGroupPic = (contact.remoteJid || fallbackRemoteJid)?.includes(
          "@g.us"
        );

        let filename: string;
        if (isNil(profilePicUrl) || profilePicUrl.includes("nopicture")) {
          filename = "";
        } else {
          filename = `${contact.id}.jpeg`;
          const filePath = join(folder, filename);

          if (fs.existsSync(filePath) && contact.urlPicture === filename) {
            // Arquivo já existe e é o mesmo, não precisa baixar novamente
            updateImage = false;
          } else {
            // Remove arquivo antigo se existir e for diferente
            if (
              !isNil(contact.urlPicture) &&
              contact.urlPicture !== filename &&
              !contact.urlPicture.includes("nopicture")
            ) {
              const oldBaseName = contact.urlPicture
                .replace(/\\/g, "/")
                .split("/")
                .pop();
              if (oldBaseName) {
                const oldFileName = path.join(folder, oldBaseName);
                if (fs.existsSync(oldFileName)) {
                  fs.unlinkSync(oldFileName);
                }
              }
            }

            // ✅ REFACTORED: Download de foto em background (não bloqueia o fluxo principal)
            const downloadProfilePicture = async () => {
              try {
                logger.info(
                  `[PIC-ASYNC] Iniciando download assíncrono da foto: ${profilePicUrl}`
                );

                const response = await axios.get(profilePicUrl, {
                  responseType: "arraybuffer",
                  timeout: 10000 // 10s timeout para evitar travamento
                });

                // ✅ Usar fs.promises.writeFile (assíncrono) ao invés de writeFileSync
                await fsp.writeFile(filePath, response.data);
                logger.info(`[PIC-ASYNC] ✅ Foto salva em disco: ${filePath}`);

                // ✅ Atualizar o contato no banco após salvar a foto
                await contact.update({
                  urlPicture: filename,
                  pictureUpdated: true
                });

                // ✅ Emitir evento via Socket para atualizar a UI em tempo real
                const io = getIO();
                io.of(String(contact.companyId)).emit(
                  `company-${contact.companyId}-contact`,
                  {
                    action: "update",
                    contact: contact.toJSON()
                  }
                );

                logger.info(
                  `[PIC-ASYNC] ✅ Contato atualizado com foto via Socket`
                );
              } catch (e) {
                logger.error(
                  `[PIC-ASYNC] ❌ Erro ao baixar/salvar foto: ${e.message}`
                );
                // Não altera o filename para nopicture.png - mantém o estado atual
              }
            };

            // ✅ Disparar o download em background SEM await (fire-and-forget)
            downloadProfilePicture().catch(err => {
              logger.error(`[PIC-ASYNC] Erro não capturado: ${err.message}`);
            });

            // ✅ Retornar imediatamente - a foto será atualizada depois
            logger.info(
              `[PIC-ASYNC] 🚀 Download disparado em background, retornando contato imediatamente`
            );
          }
        }

        if (updateImage || isNil(contact.urlPicture)) {
          await contact.update({
            urlPicture: filename,
            profilePicUrl: filename,
            pictureUpdated: true
          });
          await contact.reload();
          setCachedContact(companyId, cleanNumber, contact);
        }
      }

      io.of(String(companyId)).emit(`company-${companyId}-contact`, {
        action: createContact ? "create" : "update",
        contact: contact.toJSON()
      });

      if (ENABLE_LID_DEBUG) {
        logger.info(
          `[RDS-LID] Retornando contato: { jid: '${contact.remoteJid}', exists: true, lid: '${contact.lid}' }`
        );
      }
      return contact;
    } catch (err) {
      logger.error("Error to find or create a contact:", err);
      throw err;
    }
  });
};

export default CreateOrUpdateContactService;
