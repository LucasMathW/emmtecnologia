import axios from "axios";
import CallHistory from "../../models/CallHistory"
import Company from "../../models/Company";
import User from "../../models/User";
import cacheLayer from "../../libs/cache";
import Whatsapp from "../../models/Whatsapp";

const loginWavoip = async () => {
    try {
        const login: any = await axios.post(`${process.env.WAVOIP_URL}/login`, {
            "email": process.env.WAVOIP_USERNAME,
            "password": process.env.WAVOIP_PASSWORD
        });

        if (!login?.data?.result?.token) {
            throw new Error("Não foi possivel realizar login na wavoip");
        }

        return login?.data?.result?.token;
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Erro ao conectar na WavoIP");
    }
}

const getHistorical = async (body: { "user_id": number, "company_id": number }) => {

    try {
        const chave = `loginWavoipToken:${body.company_id}`;
        let token = await cacheLayer.get(chave);

        if (!token) {
            token = await loginWavoip();
            await cacheLayer.set(chave, token, "EX", 3600);
        }

        const devices: any = await axios.get(`${process.env.WAVOIP_URL}/devices/me`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const user = await User.findOne({
            raw: true,
            nest: true,
             include: [{
                model: Whatsapp,
                attributes: ['id', 'wavoip'],
            }],
            where: {
                id: body.user_id
            }
        });

        if(!user?.whatsapp?.wavoip){
            return [];
        }

        let devicesAll = [];

        for (const device of devices?.data?.result) {
            try {
                if(user?.whatsapp?.wavoip != device?.token){
                    continue;
                }

                const regs: any = await axios.get(`${process.env.WAVOIP_URL}/calls/devices/${device.id}`, {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });

                if (regs?.data?.result?.length <= 0) {
                    continue;
                }

                for (const reg of regs.data.result) {
                    devicesAll.push({ ...reg, token: device.token });
                }

            } catch (error) {
                continue;
            }
        }

        if (devicesAll.length <= 0) {
            return devicesAll;
        }



        const historicalDB: any = await CallHistory.findAll({
            raw: true,
            nest: true,
            include: [{
                model: User,
                attributes: ['id', 'name'],
            },
            {
                model: Company,
                attributes: ['id', 'name'],
            }],
            where: {
                company_id: body.company_id
            }
        })


        const resultFinal = [];
        const cache = [];

        let totalServed = 0;
        let totalDuration = 0;
        let totalUnmet = 0;
        let totalReject = 0;
        let totalCallsAnswered = 0;
        let totalFinish = 0;
        let total = 0;

        // Track incoming/ outcoming IDs already covered by wavoip API
        const incomingApiIds = [];
        const outgoingApiIds = [];

        for (const device of devicesAll) {
            let callSaveUrl = '';
            if (device?.duration) {
                callSaveUrl = `https://storage.wavoip.com/${device?.whatsapp_call_id}`;
            }
             if (device.direction == 'OUTCOMING') {
                const historicMatch = historicalDB.find(h =>
                    h.token_wavoip === device.token &&
                    Math.abs(new Date(h.createdAt).getTime() - new Date(device.created_date).getTime()) <= 1 * 60 * 1000 // diferença de até 1 minutos
                );

                if (historicMatch && !cache.includes(historicMatch.id)) {
                    cache.push(historicMatch.id);
                    resultFinal.push({ ...historicMatch, devices: device, callSaveUrl });
                    outgoingApiIds.push(historicMatch.id);
                }
            }

            if (device.direction == 'INCOMING') {
                incomingApiIds.push(device.id);
                resultFinal.push({ devices: device, callSaveUrl, user: { id: '', name: '' }, company: { id: '', name: '' }, phone_to: device?.caller, createdAt: device?.created_date });
            }

            if (device?.duration) {
                totalServed += 1;
            }

            if (device?.status == "ENDED") {
                totalFinish += 1;
            }

            if (device?.status == "REJECTED") {
                totalReject += 1;
            }

            total += 1;
        }

        // Also add incoming calls saved locally to DB that weren't covered by the WavoIP API
        for (const record of historicalDB) {
            if (!record.phone_to) continue;
            const isIncomingFromApi = incomingApiIds.some(id => true); // API already covers some
            const isOutgoingCached = outgoingApiIds.includes(record.id);

            // Add local incoming calls that aren't already in resultFinal
            if (!isOutgoingCached && !record.devices) {
                // Check if this local record is not already merged via OUTCOMING match
                const alreadyInResult = resultFinal.some(r => r.id === record.id);
                if (!alreadyInResult) {
                    resultFinal.push(record);
                }
            }
        }

        return { resultFinal, total, totalReject, totalServed, totalFinish };

    } catch (error: unknown) {
        // WavoIP falhou — retorna apenas registros locais do banco
        const historicalDB: any = await CallHistory.findAll({
            raw: true,
            nest: true,
            include: [{
                model: User,
                attributes: ['id', 'name'],
            },
            {
                model: Company,
                attributes: ['id', 'name'],
            }],
            where: {
                company_id: body.company_id
            }
        });

        return {
            resultFinal: historicalDB,
            total: historicalDB.length,
            totalReject: historicalDB.filter((h: any) => h.devices?.status === 'REJECTED').length,
            totalServed: historicalDB.filter((h: any) => h.devices?.duration).length,
            totalFinish: historicalDB.filter((h: any) => h.devices?.status === 'ENDED').length,
        };
    }
}

export default getHistorical;