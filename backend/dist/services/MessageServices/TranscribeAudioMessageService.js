"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const Message_1 = __importDefault(require("../../models/Message"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const TranscribeAudioMessageToText = async (wid, companyId) => {
  try {
    // Busca a mensagem com os detalhes do arquivo de áudio
    const msg = await Message_1.default.findOne({
      where: {
        wid: wid,
        companyId: companyId
      }
    });
    if (!msg) {
      throw new Error("Mensagem não encontrada");
    }
    const data = new form_data_1.default();
    let config;
    // Verifica se a mediaUrl é uma URL válida
    if (msg.mediaUrl.startsWith("http")) {
      // Se for uma URL, usa diretamente
      data.append("url", msg.mediaUrl);
      config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `${process.env.TRANSCRIBE_URL}/transcriptions`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TRANSCRIBE_API_KEY}`,
          ...data.getHeaders()
        },
        data: data
      };
    } else {
      // Se não for URL, mantém o comportamento atual
      const urlParts = new URL(msg.mediaUrl);
      const pathParts = urlParts.pathname.split("/");
      const fileName = pathParts[pathParts.length - 1];
      const publicFolder = path_1.default.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "public"
      );
      const filePath = path_1.default.join(
        publicFolder,
        `company${companyId}`,
        fileName
      );
      if (!fs_1.default.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }
      data.append("audio", fs_1.default.createReadStream(filePath));
      config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `${process.env.TRANSCRIBE_URL}/transcriptions`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TRANSCRIBE_API_KEY}`,
          ...data.getHeaders()
        },
        data: data
      };
    }
    // Faz a requisição para o endpoint
    const res = await axios_1.default.request(config);
    await msg.update({
      body: res.data,
      transcrito: true
    });
    return res.data;
  } catch (error) {
    console.error("Erro durante a transcrição:", error);
    return "Conversão pra texto falhou";
  }
};
exports.default = TranscribeAudioMessageToText;
