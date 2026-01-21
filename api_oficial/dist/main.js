"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_2 = require("@nestjs/common");
const error_exception_filter_1 = require("./@core/infra/filters/error-exception.filter");
const prisma_filter_1 = require("./@core/infra/filters/prisma.filter");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const logger = new common_1.Logger('MainServer');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.useGlobalPipes(new common_2.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    app.useGlobalFilters(new error_exception_filter_1.ErrorExceptionFilter());
    const { httpAdapter } = app.get(core_1.HttpAdapterHost);
    app.useGlobalFilters(new prisma_filter_1.PrismaClienteExceptionFilter(httpAdapter));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Mult100 Router API')
        .setDescription('API')
        .setVersion('1.0.0')
        .addBearerAuth()
        .addSecurityRequirements('bearer')
        .build();
    const options = {
        include: [],
    };
    const document = swagger_1.SwaggerModule.createDocument(app, config, options);
    swagger_1.SwaggerModule.setup('swagger', app, document);
    await app.listen(process.env.PORT);
    logger.log(`🚀 Servidor API Oficial iniciado na porta ${process.env.PORT}`);
}
bootstrap();
//# sourceMappingURL=main.js.map