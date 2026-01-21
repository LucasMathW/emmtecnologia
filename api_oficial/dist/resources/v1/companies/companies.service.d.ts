import { Logger } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PrismaService } from 'src/@core/infra/database/prisma.service';
export declare class CompaniesService {
    readonly prisma: PrismaService;
    logger: Logger;
    constructor(prisma: PrismaService);
    one(id: number): Promise<{
        name: string;
        idEmpresaMult100: number;
        id: number;
        create_at: Date | null;
        update_at: Date | null;
        deleted_at: Date | null;
        token: string;
    }>;
    all(): Promise<{
        name: string;
        idEmpresaMult100: number;
        id: number;
        create_at: Date | null;
        update_at: Date | null;
        deleted_at: Date | null;
        token: string;
    }[]>;
    create(dto: CreateCompanyDto): Promise<{
        name: string;
        idEmpresaMult100: number;
        id: number;
        create_at: Date | null;
        update_at: Date | null;
        deleted_at: Date | null;
        token: string;
    }>;
    update(id: number, dto: UpdateCompanyDto): Promise<{
        name: string;
        idEmpresaMult100: number;
        id: number;
        create_at: Date | null;
        update_at: Date | null;
        deleted_at: Date | null;
        token: string;
    }>;
}
