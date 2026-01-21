import { $Enums, Prisma } from '@prisma/client';
export declare class SendMessageWhatsApp implements Prisma.sendMessageWhatsAppUncheckedCreateInput {
    id?: number;
    create_at?: string | Date;
    update_at?: string | Date;
    deleted_at?: string | Date;
    type: $Enums.typeMessage;
    to: string;
    text?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    reaction?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    audio?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    document?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    image?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    sticker?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    video?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    location?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    contacts?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    interactive?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    template?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    idMessageWhatsApp?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    enviada?: boolean;
    pathFile?: string;
    idFileMeta?: string;
    whatsappOficialId: number;
    constructor();
}
