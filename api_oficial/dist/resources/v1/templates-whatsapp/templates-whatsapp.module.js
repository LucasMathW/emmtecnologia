"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplatesWhatsappModule = void 0;
const common_1 = require("@nestjs/common");
const templates_whatsapp_service_1 = require("./templates-whatsapp.service");
const templates_whatsapp_controller_1 = require("./templates-whatsapp.controller");
const prisma_service_1 = require("../../../@core/infra/database/prisma.service");
const meta_service_1 = require("../../../@core/infra/meta/meta.service");
const RedisService_service_1 = require("../../../@core/infra/redis/RedisService.service");
let TemplatesWhatsappModule = class TemplatesWhatsappModule {
};
exports.TemplatesWhatsappModule = TemplatesWhatsappModule;
exports.TemplatesWhatsappModule = TemplatesWhatsappModule = __decorate([
    (0, common_1.Module)({
        controllers: [templates_whatsapp_controller_1.TemplatesWhatsappController],
        providers: [
            templates_whatsapp_service_1.TemplatesWhatsappService,
            prisma_service_1.PrismaService,
            meta_service_1.MetaService,
            RedisService_service_1.RedisService,
        ],
        exports: [templates_whatsapp_service_1.TemplatesWhatsappService],
    })
], TemplatesWhatsappModule);
//# sourceMappingURL=templates-whatsapp.module.js.map