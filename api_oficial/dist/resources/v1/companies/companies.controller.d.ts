import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
export declare class CompaniesController {
    private readonly service;
    constructor(service: CompaniesService);
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
    create(body: CreateCompanyDto): Promise<{
        name: string;
        idEmpresaMult100: number;
        id: number;
        create_at: Date | null;
        update_at: Date | null;
        deleted_at: Date | null;
        token: string;
    }>;
    atualizar(id: number, body: UpdateCompanyDto): Promise<{
        name: string;
        idEmpresaMult100: number;
        id: number;
        create_at: Date | null;
        update_at: Date | null;
        deleted_at: Date | null;
        token: string;
    }>;
}
