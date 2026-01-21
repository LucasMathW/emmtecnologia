export declare class RedisService {
    private client;
    private logger;
    constructor();
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    exists(key: string): Promise<boolean>;
    expire(key: string, ttlSeconds: number): Promise<void>;
    ttl(key: string): Promise<number>;
    quit(): Promise<void>;
}
