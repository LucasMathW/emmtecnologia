import { Logger } from '@nestjs/common';
import { PrismaService } from '../infra/database/prisma.service';
import { FindOperator } from '../common/utils/FindOperator';
export declare class BaseService<T> {
    entity: string;
    prisma: PrismaService;
    logger: Logger;
    constructor(entity: string, name_service: string);
    private checkInstance;
    create(data: any): Promise<T>;
    all(): Promise<Array<T>>;
    one(id: number): Promise<T>;
    findWith(operator: FindOperator): Promise<Array<T>>;
    findWithOne(operator: FindOperator): Promise<T>;
    update(id: number, data: T): Promise<T>;
    delete(id: number): Promise<T>;
}
