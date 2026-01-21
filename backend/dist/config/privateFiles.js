"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const privateFolder = path_1.default.resolve(__dirname, "..", "..", "private");
exports.default = {
    directory: privateFolder,
    storage: multer_1.default.diskStorage({
        destination: privateFolder,
        filename(req, file, cb) {
            const fileName = file.originalname.replace(/\s/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return cb(null, fileName);
        }
    })
};
