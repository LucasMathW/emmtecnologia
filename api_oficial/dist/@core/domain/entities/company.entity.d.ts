import { Prisma } from '@prisma/client';
export declare class Company implements Prisma.companyUncheckedCreateInput {
    id?: number;
    create_at?: string | Date;
    update_at?: string | Date;
    deleted_at?: string | Date;
    name: string;
    whatsappOficial?: Prisma.whatsappOficialUncheckedCreateNestedManyWithoutCompanyInput;
    idEmpresaMult100: number;
    constructor();
}
