"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMultiFileAuthState = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const baileys_1 = require("baileys");
const useMultiFileAuthState = async (folder) => {
    const writeData = (data, file) => {
        return (0, promises_1.writeFile)((0, path_1.join)(folder, fixFileName(file)), JSON.stringify(data, baileys_1.BufferJSON.replacer));
    };
    const readData = async (file) => {
        try {
            const data = await (0, promises_1.readFile)((0, path_1.join)(folder, fixFileName(file)), { encoding: 'utf-8' });
            return JSON.parse(data, baileys_1.BufferJSON.reviver);
        }
        catch (error) {
            return null;
        }
    };
    const removeData = async (file) => {
        try {
            await (0, promises_1.unlink)((0, path_1.join)(folder, fixFileName(file)));
        }
        catch {
        }
    };
    const folderInfo = await (0, promises_1.stat)(folder).catch(() => { });
    if (folderInfo) {
        if (!folderInfo.isDirectory()) {
            throw new Error(`found something that is not a directory at ${folder}, either delete it or specify a different location`);
        }
    }
    else {
        await (0, promises_1.mkdir)(folder, { recursive: true });
    }
    const fixFileName = (file) => file?.replace(/\//g, '__')?.replace(/:/g, '-');
    const creds = await readData('creds.json') || (0, baileys_1.initAuthCreds)();
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}.json`);
                        if (type === 'app-state-sync-key' && value) {
                            value = baileys_1.proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }));
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const file = `${category}-${id}.json`;
                            tasks.push(value ? writeData(value, file) : removeData(file));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, 'creds.json');
        }
    };
};
exports.useMultiFileAuthState = useMultiFileAuthState;
