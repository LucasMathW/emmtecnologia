import path from "path";
import fs from "fs";
import Message from "../../models/Message";
import Setting from "../../models/Setting";

import axios from "axios";
import FormData from "form-data";
import { Transcription } from "openai/resources/audio/transcriptions";
import { ms } from "date-fns/locale";

type Response = Transcription | string;

const TranscribeAudioMessageToText = async (
  wid: string,
  companyId: string
): Promise<Response> => {
  try {
    // Busca a mensagem com os detalhes do arquivo de áudio
    const msg = await Message.findOne({
      where: {
        wid: wid,
        companyId: companyId
      }
    });

    if (!msg) {
      throw new Error("Mensagem não encontrada");
    }

    const setting = await Setting.findOne({
      where: { key: "openaiTranscribeApiKey" }
    });

    const data = new FormData();
    let config;

    console.log(`msg.mediaUrl: ${msg.mediaUrl}`);

    const openaikey = setting?.value || process.env.TRANSCRIBE_API_KEY;
    console.log(`[DEBUG LUCAS, OPENAIKEY][${openaikey}]`);

    if (!openaikey) {
      throw new Error("Chave Não configurada!");
    }

    // Verifica se a mediaUrl é uma URL válida
    if (msg.mediaUrl.startsWith("http")) {
      console.log(`{É URl}`);

      // 1️⃣ baixa o áudio
      const audioResponse = await axios.get(msg.mediaUrl, {
        responseType: "stream"
      });

      data.append("file", audioResponse.data, {
        filename: "audio.ogg"
      });

      data.append("model", "whisper-1");

      // Se for uma URL, usa diretamente
      data.append("url", msg.mediaUrl);
      config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `${process.env.TRANSCRIBE_URL}/transcriptions`,
        headers: {
          // "Content-Type": "application/json",
          Authorization: `Bearer ${openaikey}`,
          ...data.getHeaders()
        },
        data: data
      };
    } else {
      console.log(`{Não é url}`);

      const urlParts = new URL(msg.mediaUrl);
      const pathParts = urlParts.pathname.split("/");
      const fileName = pathParts[pathParts.length - 1];

      const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
      const filePath = path.join(publicFolder, `company${companyId}`, fileName);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      data.append("file", fs.createReadStream(filePath));
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
    const res = await axios.request(config);

    const transcriptionText =
      typeof res.data === "string" ? res.data : res.data?.text ?? "";

    await msg.update({
      body: transcriptionText,
      transcribed: true
    });

    return transcriptionText;
  } catch (err) {
    console.error("ERRO COMPLETO:", {
      message: err.message,
      code: err.code,
      responseStatus: err.response?.status,
      responseData: err.response?.data,
      stack: err.stack
    });

    return "Conversão pra texto falhou";
  }
};

export default TranscribeAudioMessageToText;
