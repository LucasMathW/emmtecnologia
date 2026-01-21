export declare function savedFile(file: Express.Multer.File, pathFile: string, fileName: string): Promise<string>;
export declare function deleteFile(path: string): void;
export declare function getBase64(path: string): string;
export declare function checkPasteFiles(pathPaste: string): void;
export declare function createPaste(pathPaste: string): void;
