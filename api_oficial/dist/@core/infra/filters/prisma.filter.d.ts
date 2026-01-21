import { ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
export declare class PrismaClienteExceptionFilter extends BaseExceptionFilter {
    private readonly logger;
    catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void;
}
