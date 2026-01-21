"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savedFile = savedFile;
exports.deleteFile = deleteFile;
exports.getBase64 = getBase64;
exports.checkPasteFiles = checkPasteFiles;
exports.createPaste = createPaste;
const fs_1 = require("fs");
const util_1 = require("util");
const path = './public';
async function savedFile(file, pathFile, fileName) {
    if (!(0, fs_1.existsSync)(`${path}`))
        (0, fs_1.mkdirSync)(path);
    const date = new Date();
    if (!file)
        throw new Error('Nenhum arquivo fornecido.');
    const { buffer, mimetype } = file;
    const filePath = `${path}/${pathFile}/${date.getMilliseconds()}-${fileName}`;
    if (!!(0, fs_1.existsSync)(filePath))
        throw new Error('Já existe um arquivo com este nome');
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error('Buffer de arquivo inválido.');
    }
    const writeFileAsync = (0, util_1.promisify)(fs_1.writeFile);
    try {
        await writeFileAsync(filePath, buffer);
        return filePath;
    }
    catch (err) {
        throw new Error(`Erro ao salvar o arquivo: ${err.message}`);
    }
}
function deleteFile(path) {
    if (!path)
        throw new Error('Necessário informar o caminho do arquivo');
    if (!(0, fs_1.existsSync)(path))
        throw new Error('Não existe um arquivo com este nome');
    try {
        (0, fs_1.unlinkSync)(path);
        return;
    }
    catch (error) {
        throw new Error(`Não foi possível deletar o arquivo`);
    }
}
function getBase64(path) {
    const file = (0, fs_1.readFileSync)(path);
    return file.toString(`base64`);
}
function checkPasteFiles(pathPaste) {
    const pathCheck = `${path}/${pathPaste}`;
    if (!(0, fs_1.existsSync)(pathCheck))
        (0, fs_1.mkdirSync)(pathCheck);
}
function createPaste(pathPaste) {
    if (!checkPasteFiles)
        (0, fs_1.mkdirSync)(path);
}
//# sourceMappingURL=files.utils.js.map