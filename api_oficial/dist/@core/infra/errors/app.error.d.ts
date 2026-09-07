export declare class AppError extends Error {
    message: string;
    code: number;
    constructor(message: string, code?: number);
}
