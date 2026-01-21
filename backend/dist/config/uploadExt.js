"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const publicFolder = path_1.default.resolve(__dirname, "..", "..", "public");
exports.default = {
    directory: publicFolder,
    storage: multer_1.default.diskStorage({
        destination: publicFolder,
        filename(req, file, cb) {
            const fileName = file.originalname.replace(/\s/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (fileName.split('.')[1] === 'mp3' || fileName.split('.')[1] === 'ogg' || fileName.split('.')[1] === 'opus') {
                return cb(null, fileName);
            }
            return cb(null, fileName + '.' + file.mimetype.split('/')[1]);
        }
    })
};
