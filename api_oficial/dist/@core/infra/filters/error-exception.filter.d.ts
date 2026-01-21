import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { AppError } from '../errors/app.error';
export declare class ErrorExceptionFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: AppError, host: ArgumentsHost): void;
}
