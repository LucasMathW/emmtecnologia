export declare const hashPasswordTransform: {
    to(password: string, salt: string): Promise<string>;
    compare(password: string, hash: string): Promise<boolean>;
    salt(): Promise<string>;
};
