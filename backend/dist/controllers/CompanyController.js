"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexPlan = exports.listPlan = exports.remove = exports.updateSchedules = exports.update = exports.list = exports.show = exports.store = exports.index = exports.clearAllCache = exports.invalidateCompanyCache = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const auth_1 = __importDefault(require("../config/auth"));
const Yup = __importStar(require("yup"));
const moment_1 = __importDefault(require("moment"));
// import { getIO } from "../libs/socket";
const AppError_1 = __importDefault(require("../errors/AppError"));
const Company_1 = __importDefault(require("../models/Company"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fs_2 = require("fs");
const ListCompaniesService_1 = __importDefault(require("../services/CompanyService/ListCompaniesService"));
const CreateCompanyService_1 = __importDefault(require("../services/CompanyService/CreateCompanyService"));
const UpdateCompanyService_1 = __importDefault(require("../services/CompanyService/UpdateCompanyService"));
const ShowCompanyService_1 = __importDefault(require("../services/CompanyService/ShowCompanyService"));
const UpdateSchedulesService_1 = __importDefault(require("../services/CompanyService/UpdateSchedulesService"));
const DeleteCompanyService_1 = __importDefault(require("../services/CompanyService/DeleteCompanyService"));
const FindAllCompaniesService_1 = __importDefault(require("../services/CompanyService/FindAllCompaniesService"));
const ShowPlanCompanyService_1 = __importDefault(require("../services/CompanyService/ShowPlanCompanyService"));
const User_1 = __importDefault(require("../models/User"));
const ListCompaniesPlanService_1 = __importDefault(require("../services/CompanyService/ListCompaniesPlanService"));
// Cache simples em memória com TTL de 5 minutos
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const metricsCache = new Map();
const publicFolder = path_1.default.resolve(__dirname, "..", "..", "public");
// Função para verificar se o cache está válido
const isCacheValid = (cachedAt) => {
    return Date.now() - cachedAt.getTime() < CACHE_TTL_MS;
};
// Função para limpar cache expirado (opcional, para evitar memory leak)
const cleanExpiredCache = () => {
    const now = Date.now();
    for (const [companyId, cached] of metricsCache.entries()) {
        if (now - cached.cachedAt.getTime() >= CACHE_TTL_MS) {
            metricsCache.delete(companyId);
        }
    }
};
const calculateDirectoryMetrics = async (companyId) => {
    // Verificar se existe cache válido
    const cached = metricsCache.get(companyId);
    if (cached && isCacheValid(cached.cachedAt)) {
        return {
            folderSize: cached.folderSize,
            numberOfFiles: cached.numberOfFiles,
            lastUpdate: cached.lastUpdate
        };
    }
    const folderPath = path_1.default.join(publicFolder, `company${companyId}`);
    try {
        if (!fs_1.default.existsSync(folderPath)) {
            console.warn(`Directory does not exist: ${folderPath}`);
            const result = {
                folderSize: 0,
                numberOfFiles: 0,
                lastUpdate: null,
            };
            // Cachear o resultado
            metricsCache.set(companyId, {
                ...result,
                cachedAt: new Date()
            });
            return result;
        }
        const files = await fs_2.promises.readdir(folderPath);
        let totalSize = 0;
        let numberOfFiles = files.length;
        let lastUpdate = new Date(0);
        for (const file of files) {
            const filePath = path_1.default.join(folderPath, file);
            const stats = await fs_2.promises.stat(filePath);
            totalSize += stats.size;
            if (stats.mtime > lastUpdate) {
                lastUpdate = stats.mtime;
            }
        }
        const result = {
            folderSize: totalSize,
            numberOfFiles,
            lastUpdate,
        };
        // Cachear o resultado
        metricsCache.set(companyId, {
            ...result,
            cachedAt: new Date()
        });
        return result;
    }
    catch (error) {
        console.error(`Error calculating directory metrics for company ${companyId}:`, error);
        const result = {
            folderSize: 0,
            numberOfFiles: 0,
            lastUpdate: null,
        };
        // Cachear mesmo em caso de erro para evitar retry imediato
        metricsCache.set(companyId, {
            ...result,
            cachedAt: new Date()
        });
        return result;
    }
};
// Função utilitária para invalidar cache de uma empresa específica
const invalidateCompanyCache = (companyId) => {
    metricsCache.delete(companyId);
};
exports.invalidateCompanyCache = invalidateCompanyCache;
// Função utilitária para limpar todo o cache
const clearAllCache = () => {
    metricsCache.clear();
};
exports.clearAllCache = clearAllCache;
// Limpeza automática do cache a cada 10 minutos
setInterval(cleanExpiredCache, 10 * 60 * 1000);
const index = async (req, res) => {
    const { searchParam, pageNumber } = req.query;
    const authHeader = req.headers.authorization;
    const [, token] = authHeader.split(" ");
    const decoded = (0, jsonwebtoken_1.verify)(token, auth_1.default.secret);
    const { id, profile, companyId } = decoded;
    const company = await Company_1.default.findByPk(companyId);
    const requestUser = await User_1.default.findByPk(id);
    if (requestUser.super === true) {
        const { companies, count, hasMore } = await (0, ListCompaniesService_1.default)({
            searchParam,
            pageNumber
        });
        return res.json({ companies, count, hasMore });
    }
    else {
        const { companies, count, hasMore } = await (0, ListCompaniesService_1.default)({
            searchParam: company.name,
            pageNumber
        });
        return res.json({ companies, count, hasMore });
    }
};
exports.index = index;
const store = async (req, res) => {
    const newCompany = req.body;
    const schema = Yup.object().shape({
        name: Yup.string().required(),
        password: Yup.string().required().min(5)
    });
    try {
        await schema.validate(newCompany);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const company = await (0, CreateCompanyService_1.default)(newCompany);
    return res.status(200).json(company);
};
exports.store = store;
const show = async (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    const [, token] = authHeader.split(" ");
    const decoded = (0, jsonwebtoken_1.verify)(token, auth_1.default.secret);
    const { id: requestUserId, profile, companyId } = decoded;
    const requestUser = await User_1.default.findByPk(requestUserId);
    if (requestUser.super === true) {
        const company = await (0, ShowCompanyService_1.default)(id);
        return res.status(200).json(company);
    }
    else if (id !== companyId.toString()) {
        return res.status(400).json({ error: "Você não possui permissão para acessar este recurso!" });
    }
    else if (id === companyId.toString()) {
        const company = await (0, ShowCompanyService_1.default)(id);
        return res.status(200).json(company);
    }
};
exports.show = show;
const list = async (req, res) => {
    const authHeader = req.headers.authorization;
    const [, token] = authHeader.split(" ");
    const decoded = (0, jsonwebtoken_1.verify)(token, auth_1.default.secret);
    const { id, profile, companyId } = decoded;
    const requestUser = await User_1.default.findByPk(id);
    if (requestUser.super === true) {
        const companies = await (0, FindAllCompaniesService_1.default)();
        return res.status(200).json(companies);
    }
    else {
        const companies = await (0, FindAllCompaniesService_1.default)();
        let company = [];
        for (let i = 0; i < companies.length; i++) {
            const id = companies[i].id;
            if (id === companyId) {
                company.push(companies[i]);
                return res.status(200).json(company);
            }
        }
    }
};
exports.list = list;
const update = async (req, res) => {
    const companyData = req.body;
    const schema = Yup.object().shape({
        name: Yup.string()
    });
    try {
        await schema.validate(companyData);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    const [, token] = authHeader.split(" ");
    const decoded = (0, jsonwebtoken_1.verify)(token, auth_1.default.secret);
    const { id: requestUserId, profile, companyId } = decoded;
    const requestUser = await User_1.default.findByPk(requestUserId);
    if (requestUser.super === true) {
        const company = await (0, UpdateCompanyService_1.default)({ id, ...companyData });
        // Invalidar cache da empresa atualizada
        (0, exports.invalidateCompanyCache)(parseInt(id));
        return res.status(200).json(company);
    }
    else if (String(companyData?.id) !== id || String(companyId) !== id) {
        return res.status(400).json({ error: "Você não possui permissão para acessar este recurso!" });
    }
    else {
        const company = await (0, UpdateCompanyService_1.default)({ id, ...companyData });
        // Invalidar cache da empresa atualizada
        (0, exports.invalidateCompanyCache)(parseInt(id));
        return res.status(200).json(company);
    }
};
exports.update = update;
const updateSchedules = async (req, res) => {
    const { schedules } = req.body;
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    const [, token] = authHeader.split(" ");
    const decoded = (0, jsonwebtoken_1.verify)(token, auth_1.default.secret);
    const { id: requestUserId, profile, companyId } = decoded;
    const requestUser = await User_1.default.findByPk(requestUserId);
    if (requestUser.super === true) {
        const company = await (0, UpdateSchedulesService_1.default)({ id, schedules });
        return res.status(200).json(company);
    }
    else if (companyId.toString() !== id) {
        return res.status(400).json({ error: "Você não possui permissão para acessar este recurso!" });
    }
    else {
        const company = await (0, UpdateSchedulesService_1.default)({ id, schedules });
        return res.status(200).json(company);
    }
};
exports.updateSchedules = updateSchedules;
const remove = async (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    const [, token] = authHeader.split(" ");
    const decoded = (0, jsonwebtoken_1.verify)(token, auth_1.default.secret);
    const { id: requestUserId, profile, companyId } = decoded;
    const requestUser = await User_1.default.findByPk(requestUserId);
    if (requestUser.super === true) {
        const company = await (0, DeleteCompanyService_1.default)(id);
        // Invalidar cache da empresa removida
        (0, exports.invalidateCompanyCache)(parseInt(id));
        return res.status(200).json(company);
    }
    else {
        return res.status(400).json({ error: "Você não possui permissão para acessar este recurso!" });
    }
};
exports.remove = remove;
const listPlan = async (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    const [, token] = authHeader.split(" ");
    const decoded = (0, jsonwebtoken_1.verify)(token, auth_1.default.secret);
    const { id: requestUserId, profile, companyId } = decoded;
    const requestUser = await User_1.default.findByPk(requestUserId);
    if (requestUser.super === true) {
        const company = await (0, ShowPlanCompanyService_1.default)(id);
        return res.status(200).json(company);
    }
    else if (companyId.toString() !== id) {
        return res.status(400).json({ error: "Você não possui permissão para acessar este recurso!" });
    }
    else {
        const company = await (0, ShowPlanCompanyService_1.default)(id);
        return res.status(200).json(company);
    }
};
exports.listPlan = listPlan;
const indexPlan = async (req, res) => {
    const { searchParam, pageNumber } = req.query;
    const authHeader = req.headers.authorization;
    const [, token] = authHeader.split(" ");
    const decoded = (0, jsonwebtoken_1.verify)(token, auth_1.default.secret);
    const { id, profile, companyId } = decoded;
    const requestUser = await User_1.default.findByPk(id);
    if (requestUser.super === true) {
        try {
            const companies = await (0, ListCompaniesPlanService_1.default)();
            // Transformar os dados das empresas com tipagem correta
            const companiesData = companies.map(company => {
                const plainCompany = company.get({ plain: true });
                return {
                    ...plainCompany,
                    status: !!plainCompany.status
                };
            });
            // Agora com cache, essa operação será muito mais rápida na segunda chamada
            const companiesWithMetrics = await Promise.all(companiesData.map(async (company) => {
                const metrics = await calculateDirectoryMetrics(company.id);
                return {
                    ...company,
                    metrics: {
                        folderSize: metrics.folderSize,
                        numberOfFiles: metrics.numberOfFiles,
                        lastUpdate: metrics.lastUpdate ? (0, moment_1.default)(metrics.lastUpdate).format('DD/MM/YYYY HH:mm:ss') : null
                    }
                };
            }));
            return res.status(200).json({ companies: companiesWithMetrics });
        }
        catch (error) {
            console.error("Error fetching companies:", error);
            return res.status(500).json({ error: "Erro ao buscar dados das empresas" });
        }
    }
    else {
        return res.status(400).json({ error: "Você não possui permissão para acessar este recurso!" });
    }
};
exports.indexPlan = indexPlan;
