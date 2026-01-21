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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const auth_decorator_1 = require("./auth.decorator");
const core_1 = require("@nestjs/core");
const app_error_1 = require("../infra/errors/app.error");
const companies_service_1 = require("../../resources/v1/companies/companies.service");
let AuthGuard = class AuthGuard {
    constructor(companyService, reflector) {
        this.companyService = companyService;
        this.reflector = reflector;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(auth_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new app_error_1.AppError('Não autorizado', common_1.HttpStatus.UNAUTHORIZED);
        }
        try {
            const tokenAdmin = process.env.TOKEN_ADMIN;
            if (token != tokenAdmin)
                throw new app_error_1.AppError('Não autorizado', common_1.HttpStatus.UNAUTHORIZED);
        }
        catch {
            throw new app_error_1.AppError('Não autorizado', common_1.HttpStatus.UNAUTHORIZED);
        }
        return true;
    }
    extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [companies_service_1.CompaniesService,
        core_1.Reflector])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map