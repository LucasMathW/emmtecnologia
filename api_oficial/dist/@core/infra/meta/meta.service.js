"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MetaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const convertMimeTypeToExtension_1 = require("../../common/utils/convertMimeTypeToExtension");
const axios_1 = require("axios");
const mime_types_1 = require("mime-types");
const files_utils_1 = require("../../common/utils/files.utils");
let MetaService = MetaService_1 = class MetaService {
    constructor() {
        this.logger = new common_1.Logger(`${MetaService_1.name}`);
        this.urlMeta = `https://graph.facebook.com/v20.0`;
        this.path = `./public`;
    }
    async send(url, token, existFile = false) {
        const headers = {
            'Content-Type': !!existFile ? 'arraybuffer' : 'application/json',
            Authorization: `Bearer ${token}`,
            'User-Agent': 'curl/7.64.1',
        };
        const res = await fetch(url, { method: 'GET', headers });
        if (!!existFile) {
            return await res.json();
        }
        else {
            return (await res.json());
        }
    }
    async authFileMeta(idMessage, phone_number_id, token) {
        try {
            const url = `https://graph.facebook.com/v20.0/${idMessage}?phone_number_id=${phone_number_id}`;
            return await this.send(url, token);
        }
        catch (error) {
            this.logger.error(`authDownloadFile - ${error.message}`);
            throw Error('Erro ao converter o arquivo');
        }
    }
    async downloadFileMeta(idMessage, phone_number_id, token, companyId, conexao) {
        try {
            const auth = await this.authFileMeta(idMessage, phone_number_id, token);
            if (!(0, fs_1.existsSync)(this.path))
                (0, fs_1.mkdirSync)(this.path);
            if (!(0, fs_1.existsSync)(`${this.path}/${companyId}`))
                (0, fs_1.mkdirSync)(`${this.path}/${companyId}`);
            if (!(0, fs_1.existsSync)(`${this.path}/${companyId}/${conexao}`))
                (0, fs_1.mkdirSync)(`${this.path}/${companyId}/${conexao}`);
            const pathFile = `${this.path}/${companyId}/${conexao}`;
            const mimeType = (0, convertMimeTypeToExtension_1.convertMimeTypeToExtension)(auth.mime_type);
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'User-Agent': 'curl/7.64.1',
            };
            const result = await axios_1.default.get(auth.url, { headers, responseType: 'arraybuffer' });
            if (result.status != 200)
                throw new Error('Falha em baixar o arquivo da meta');
            const base64 = result.data.toString('base64');
            (0, fs_1.writeFileSync)(`${pathFile}/${idMessage}.${mimeType}`, result.data);
            return { base64, mimeType: auth.mime_type };
        }
        catch (error) {
            this.logger.error(`downloadFileMeta - ${error.message}`);
            throw Error('Erro ao converter o arquivo');
        }
    }
    async downloadMedia(mediaId, token) {
        try {
            const auth = await this.send(`${this.urlMeta}/${mediaId}`, token);
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'User-Agent': 'curl/7.64.1',
            };
            const result = await axios_1.default.get(auth.url, { headers, responseType: 'arraybuffer' });
            if (result.status != 200)
                throw new Error('Falha em baixar o arquivo da meta');
            const base64 = result.data.toString('base64');
            return { base64, mimeType: auth.mime_type };
        }
        catch (error) {
            this.logger.error(`downloadMedia - ${error.message}`);
            throw Error('Erro ao baixar mídia');
        }
    }
    async sendFileToMeta(numberId, token, pathFile) {
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const formData = new FormData();
            const file = (0, fs_1.readFileSync)(pathFile);
            const mimeType = (0, mime_types_1.lookup)(pathFile);
            if (!mimeType)
                throw new Error('Could not determine the MIME type of the file.');
            const blob = new Blob([file], { type: mimeType });
            formData.append('messaging_product', 'whatsapp');
            formData.append('type', mimeType);
            formData.append('file', blob);
            const result = await fetch(`${this.urlMeta}/${numberId}/media`, {
                method: 'POST',
                headers,
                body: formData,
            });
            if (result.status != 200)
                throw new Error('Falha em baixar o arquivo da meta');
            return (await result.json());
        }
        catch (error) {
            (0, files_utils_1.deleteFile)(pathFile);
            this.logger.error(`sendFileToMeta - ${error.message}`);
            throw Error('Erro ao enviar o arquivo para a meta');
        }
    }
    async uploadMedia(numberId, token, file) {
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const formData = new FormData();
            const uint8Array = new Uint8Array(file.buffer);
            const blob = new Blob([uint8Array], { type: file.mimetype });
            formData.append('messaging_product', 'whatsapp');
            formData.append('type', file.mimetype);
            formData.append('file', blob, file.originalname);
            const result = await fetch(`${this.urlMeta}/${numberId}/media`, {
                method: 'POST',
                headers,
                body: formData,
            });
            if (result.status != 200) {
                const error = await result.json();
                throw new Error(error?.error?.message || 'Falha no upload');
            }
            return (await result.json());
        }
        catch (error) {
            this.logger.error(`uploadMedia - ${error.message}`);
            throw Error('Erro ao fazer upload da mídia');
        }
    }
    async sendMessage(numberId, token, message) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            };
            const result = await fetch(`${this.urlMeta}/${numberId}/messages`, {
                method: 'POST',
                headers,
                body: JSON.stringify(message),
            });
            if (result.status != 200) {
                const resultError = await result.json();
                const errMsg = resultError?.error?.message || 'Falha ao enviar mensagem para a meta';
                throw new Error(errMsg);
            }
            return (await result.json());
        }
        catch (error) {
            this.logger.error(`sendMessage - ${error.message}`);
            throw new Error(error?.message || 'Erro ao enviar a mensagem');
        }
    }
    async getListTemplates(wabaId, token) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            };
            const result = await fetch(`${this.urlMeta}/${wabaId}/message_templates`, { method: 'GET', headers });
            if (result.status != 200) {
                const resultError = await result.json();
                throw new Error(resultError.error.message || 'Falha ao buscar templates');
            }
            return (await result.json());
        }
        catch (error) {
            this.logger.error(`getListTemplates - ${error.message}`);
            throw Error('Erro ao buscar templates');
        }
    }
    async getTemplates(wabaId, token) {
        return this.getListTemplates(wabaId, token);
    }
    async sendReadMessage(numberId, token, data) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            };
            const result = await fetch(`${this.urlMeta}/${numberId}/messages`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data),
            });
            if (result.status != 200) {
                const resultError = await result.json();
                throw new Error(resultError.error.message || 'Falha ao marcar como lida');
            }
            return (await result.json());
        }
        catch (error) {
            this.logger.error(`sendReadMessage - ${error.message}`);
            throw Error('Erro ao marcar a mensagem como lida');
        }
    }
    async markAsRead(numberId, messageId, token) {
        return this.sendReadMessage(numberId, token, {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
        });
    }
    async createTemplate(wabaId, token, payload) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            };
            const result = await fetch(`${this.urlMeta}/${wabaId}/message_templates`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            if (![200, 201].includes(result.status)) {
                const resultError = await result.json();
                throw new Error(resultError.error?.message || 'Falha ao criar template na Meta');
            }
            return await result.json();
        }
        catch (error) {
            this.logger.error(`createTemplate - ${error.message}`);
            throw Error('Erro ao criar o template na Meta');
        }
    }
    async deleteTemplate(wabaId, token, templateName) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            };
            const result = await fetch(`${this.urlMeta}/${wabaId}/message_templates?name=${templateName}`, {
                method: 'DELETE',
                headers,
            });
            if (result.status != 200) {
                const resultError = await result.json();
                throw new Error(resultError.error?.message || 'Falha ao deletar template na Meta');
            }
            return await result.json();
        }
        catch (error) {
            this.logger.error(`deleteTemplate - ${error.message}`);
            throw Error('Erro ao deletar o template na Meta');
        }
    }
};
exports.MetaService = MetaService;
exports.MetaService = MetaService = MetaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MetaService);
//# sourceMappingURL=meta.service.js.map