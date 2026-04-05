import path from "path";
import multer from "multer";
import fs from "fs";
import Whatsapp from "../models/Whatsapp";
import { isEmpty, isNil } from "lodash";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

export default {
  directory: publicFolder,
  storage: multer.diskStorage({
    destination: async function (req, file, cb) {
      let companyId;
      companyId = req.user?.companyId;
      const { typeArch, userId } = req.body;

      console.log("🛠 Upload destination - Dados recebidos:", {
        companyId,
        typeArch,
        userId,
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype
      });

      if (companyId === undefined && isNil(companyId) && isEmpty(companyId)) {
        const authHeader = req.headers.authorization;
        const [, token] = authHeader.split(" ");
        const whatsapp = await Whatsapp.findOne({ where: { token } });
        companyId = whatsapp.companyId;
      }

      let folder;

      if (typeArch === "user") {
        // Para usuários, criar pasta específica da empresa
        folder = path.resolve(publicFolder, `company${companyId}`, "user");
      } else if (typeArch && typeArch !== "announcements" && typeArch !== "logo") {
        if (typeArch === "fileList") {
          // Para fileList, usar fileId em vez de userId
          const { fileId } = req.body;
          folder = path.resolve(publicFolder, `company${companyId}`, typeArch, fileId ? String(fileId) : "");
        } else {
          folder = path.resolve(publicFolder, `company${companyId}`, typeArch, userId ? userId : "");
        }
      } else if (typeArch && typeArch === "announcements") {
        folder = path.resolve(publicFolder, typeArch);
      } else if (typeArch && typeArch === "flow") {
        folder = path.resolve(publicFolder, `company${companyId}`, typeArch);
      } else if (typeArch && typeArch === "chat") {
        // Para chat interno, usar fileId como chatId para criar pasta específica
        folder = path.resolve(publicFolder, `company${companyId}`, typeArch);
      } else if (typeArch && typeArch === "groups") {
        folder = path.resolve(publicFolder, `company${companyId}`, typeArch);
      } else if (typeArch === "logo") {
        folder = path.resolve(publicFolder);
      } else if (typeArch === "quickMessage") {
        folder = path.resolve(publicFolder, `company${companyId}`, typeArch);
      } else {
        folder = path.resolve(publicFolder, `company${companyId}`);
      }


      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        fs.chmodSync(folder, 0o777);
      }

      return cb(null, folder);
    },
    
    filename(req, file, cb) {
      const { typeArch } = req.body;
      
      console.log("🏷️ Gerando nome do arquivo:", {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        typeArch
      });
      
      // Para imagens de perfil, gerar nome único
      if (typeArch === "user" && file.mimetype.startsWith('image/')) {
        const timestamp = new Date().getTime();
        const extension = path.extname(file.originalname) || '.jpg';
        const fileName = `profile_${timestamp}${extension}`;
        return cb(null, fileName);
      }
      
      // Para arquivos de áudio gravado, garantir extensão .ogg
      if (file.fieldname === 'audio') {
        const timestamp = new Date().getTime();
        const fileName = `audio_${timestamp}.ogg`;
        return cb(null, fileName);
      }

      // Para outros arquivos de áudio, verificar se precisa converter extensão
      if (file.mimetype && file.mimetype.startsWith('audio/')) {
        const timestamp = new Date().getTime();
        let extension = '.ogg';
        
        if (file.originalname) {
          const originalExt = path.extname(file.originalname).toLowerCase();
          if (['.ogg', '.mp3', '.m4a', '.aac'].includes(originalExt)) {
            extension = originalExt;
          }
        }
        
        const fileName = typeArch && !["chat", "announcements"].includes(typeArch) 
          ? `${path.parse(file.originalname).name}_${timestamp}${extension}`
          : `audio_${timestamp}${extension}`;
        
        return cb(null, fileName);
      }

      // Para outros tipos de arquivo
      const fileName = typeArch && !["chat", "announcements"].includes(typeArch) 
        ? file.originalname.replace('/', '-').replace(/ /g, "_") 
        : new Date().getTime() + '_' + file.originalname.replace('/', '-').replace(/ /g, "_");
      
      return cb(null, fileName);
    }
  }),

  // Limite de tamanho: 100MB geral
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
};