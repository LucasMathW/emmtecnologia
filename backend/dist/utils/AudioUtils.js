"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAudioInfo = exports.validateAudioFile = exports.getMobileAudioOptions = exports.cleanupTempAudio = exports.convertToMobileAudio = exports.isAudio = void 0;
// src/utils/AudioUtils.ts
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_static_1.default);
/**
 * ✅ CORREÇÃO KISS: Utilitário simples para áudio mobile
 * Detecta e converte arquivos de áudio para formato compatível com WhatsApp Mobile
 */
// Tipos de áudio suportados pelo WhatsApp em dispositivos móveis
const MOBILE_AUDIO_CONFIG = {
    format: "ogg",
    codec: "libopus",
    mimetype: "audio/ogg; codecs=opus",
    frequency: 16000,
    bitrate: 32,
    channels: 1 // Mono para economizar dados
};
// Lista simples de extensões de áudio
const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.webm', '.m4a', '.aac'];
// Lista simples de mimetypes de áudio
const AUDIO_MIMETYPES = [
    'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav',
    'audio/webm', 'audio/m4a', 'audio/aac', 'audio/x-wav'
];
/**
 * Detecta se um arquivo é áudio de forma simples e direta
 */
const isAudio = (mimetype, filename = '') => {
    // Verificar mimetype
    if (AUDIO_MIMETYPES.includes(mimetype) || mimetype.startsWith('audio/')) {
        return true;
    }
    // Verificar extensão do arquivo
    const lowerFilename = filename.toLowerCase();
    if (AUDIO_EXTENSIONS.some(ext => lowerFilename.endsWith(ext))) {
        return true;
    }
    // Verificar padrões de nome de áudio gravado
    if (lowerFilename.includes('audio_') || lowerFilename.includes('áudio')) {
        return true;
    }
    return false;
};
exports.isAudio = isAudio;
/**
 * Converte áudio para formato otimizado para WhatsApp Mobile
 */
const convertToMobileAudio = async (inputPath, outputDir) => {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().getTime();
        const outputFileName = `mobile_audio_${timestamp}.ogg`;
        const outputPath = path_1.default.join(outputDir, outputFileName);
        console.log(`🔄 Convertendo áudio: ${inputPath} -> ${outputPath}`);
        (0, fluent_ffmpeg_1.default)(inputPath)
            .outputFormat(MOBILE_AUDIO_CONFIG.format)
            .noVideo()
            .audioCodec(MOBILE_AUDIO_CONFIG.codec)
            .audioChannels(MOBILE_AUDIO_CONFIG.channels)
            .audioFrequency(MOBILE_AUDIO_CONFIG.frequency)
            .audioBitrate(MOBILE_AUDIO_CONFIG.bitrate)
            .addOutputOptions([
            "-avoid_negative_ts", "make_zero",
            "-application", "voip",
            "-compression_level", "10",
            "-frame_duration", "20",
            "-vbr", "off" // Desabilitar VBR para compatibilidade
        ])
            .on("start", (commandLine) => {
            console.log(`🎵 Iniciando conversão: ${commandLine}`);
        })
            .on("progress", (progress) => {
            if (progress.percent) {
                console.log(`📊 Progresso: ${Math.round(progress.percent)}%`);
            }
        })
            .on("end", () => {
            console.log(`✅ Conversão concluída: ${outputPath}`);
            resolve(outputPath);
        })
            .on("error", (err) => {
            console.log(`❌ Erro na conversão: ${err.message}`);
            // Tentar limpar arquivo de saída em caso de erro
            try {
                if (fs_1.default.existsSync(outputPath)) {
                    fs_1.default.unlinkSync(outputPath);
                }
            }
            catch { }
            reject(err);
        })
            .save(outputPath);
    });
};
exports.convertToMobileAudio = convertToMobileAudio;
/**
 * Limpa arquivos temporários de áudio
 */
const cleanupTempAudio = (filePath, delayMs = 5000) => {
    setTimeout(() => {
        try {
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
                console.log(`🧹 Arquivo temporário removido: ${filePath}`);
            }
        }
        catch (error) {
            console.log(`⚠️ Erro ao remover arquivo temporário: ${error}`);
        }
    }, delayMs);
};
exports.cleanupTempAudio = cleanupTempAudio;
/**
 * Obter configuração de áudio mobile padrão
 */
const getMobileAudioOptions = (audioBuffer) => {
    return {
        audio: audioBuffer,
        mimetype: MOBILE_AUDIO_CONFIG.mimetype,
        ptt: true // Sempre como push-to-talk para melhor compatibilidade
    };
};
exports.getMobileAudioOptions = getMobileAudioOptions;
/**
 * Validar se arquivo de áudio é válido
 */
const validateAudioFile = (filePath) => {
    return new Promise((resolve) => {
        fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
            if (err) {
                console.log(`❌ Arquivo de áudio inválido: ${err.message}`);
                resolve(false);
                return;
            }
            // Verificar se tem stream de áudio
            const hasAudioStream = metadata.streams.some(stream => stream.codec_type === 'audio');
            if (!hasAudioStream) {
                console.log(`❌ Arquivo não contém stream de áudio`);
                resolve(false);
                return;
            }
            console.log(`✅ Arquivo de áudio válido`);
            resolve(true);
        });
    });
};
exports.validateAudioFile = validateAudioFile;
/**
 * Obter informações do arquivo de áudio
 */
const getAudioInfo = (filePath) => {
    return new Promise((resolve, reject) => {
        fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }
            const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
            if (!audioStream) {
                reject(new Error('Nenhum stream de áudio encontrado'));
                return;
            }
            resolve({
                duration: metadata.format.duration,
                bitrate: metadata.format.bit_rate,
                codec: audioStream.codec_name,
                sampleRate: audioStream.sample_rate,
                channels: audioStream.channels
            });
        });
    });
};
exports.getAudioInfo = getAudioInfo;
