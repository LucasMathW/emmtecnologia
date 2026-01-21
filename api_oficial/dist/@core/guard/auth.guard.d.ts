import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CompaniesService } from 'src/resources/v1/companies/companies.service';
export declare class AuthGuard implements CanActivate {
    private companyService;
    private reflector;
    constructor(companyService: CompaniesService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractTokenFromHeader;
}
