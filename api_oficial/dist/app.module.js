"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_service_1 = require("./@core/infra/database/prisma.service");
const companies_module_1 = require("./resources/v1/companies/companies.module");
const core_1 = require("@nestjs/core");
const auth_guard_1 = require("./@core/guard/auth.guard");
const webhook_module_1 = require("./resources/v1/webhook/webhook.module");
const whatsapp_oficial_module_1 = require("./resources/v1/whatsapp-oficial/whatsapp-oficial.module");
const RedisService_service_1 = require("./@core/infra/redis/RedisService.service");
const RabbitMq_service_1 = require("./@core/infra/rabbitmq/RabbitMq.service");
const socket_service_1 = require("./@core/infra/socket/socket.service");
const send_message_whatsapp_module_1 = require("./resources/v1/send-message-whatsapp/send-message-whatsapp.module");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const convertMimeTypeToExtension_1 = require("./@core/common/utils/convertMimeTypeToExtension");
const templates_whatsapp_module_1 = require("./resources/v1/templates-whatsapp/templates-whatsapp.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            companies_module_1.CompaniesModule,
            webhook_module_1.WebhookModule,
            whatsapp_oficial_module_1.WhatsappOficialModule,
            send_message_whatsapp_module_1.SendMessageWhatsappModule,
            platform_express_1.MulterModule.register({
                storage: (0, multer_1.diskStorage)({
                    destination: './public',
                    filename: (req, file, cb) => {
                        const randomName = Array(32)
                            .fill(null)
                            .map(() => Math.round(Math.random() * 16).toString(16))
                            .join('');
                        return cb(null, `${randomName}${Date.now()}${file.originalname}`);
                    },
                }),
                fileFilter: (req, file, callback) => {
                    if (!convertMimeTypeToExtension_1.mimeToExtension[file.mimetype]) {
                        return callback(new Error('Arquivo não permitido!'), false);
                    }
                    callback(null, true);
                },
            }),
            templates_whatsapp_module_1.TemplatesWhatsappModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            prisma_service_1.PrismaService,
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: auth_guard_1.AuthGuard,
            },
            RedisService_service_1.RedisService,
            RabbitMq_service_1.RabbitMQService,
            socket_service_1.SocketService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map