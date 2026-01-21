"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappOficialModule = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_oficial_service_1 = require("./whatsapp-oficial.service");
const whatsapp_oficial_controller_1 = require("./whatsapp-oficial.controller");
const client_1 = require("@prisma/client");
const RabbitMq_service_1 = require("../../../@core/infra/rabbitmq/RabbitMq.service");
let WhatsappOficialModule = class WhatsappOficialModule {
};
exports.WhatsappOficialModule = WhatsappOficialModule;
exports.WhatsappOficialModule = WhatsappOficialModule = __decorate([
    (0, common_1.Module)({
        controllers: [whatsapp_oficial_controller_1.WhatsappOficialController],
        providers: [whatsapp_oficial_service_1.WhatsappOficialService, client_1.PrismaClient, RabbitMq_service_1.RabbitMQService],
        exports: [whatsapp_oficial_service_1.WhatsappOficialService],
    })
], WhatsappOficialModule);
//# sourceMappingURL=whatsapp-oficial.module.js.map