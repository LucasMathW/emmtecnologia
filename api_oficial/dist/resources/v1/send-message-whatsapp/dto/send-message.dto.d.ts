export declare enum MessageType {
    TEXT = "text",
    IMAGE = "image",
    AUDIO = "audio",
    VIDEO = "video",
    DOCUMENT = "document",
    STICKER = "sticker",
    LOCATION = "location",
    CONTACTS = "contacts",
    INTERACTIVE = "interactive",
    TEMPLATE = "template",
    REACTION = "reaction"
}
export declare class TextMessageDto {
    body: string;
    preview_url?: boolean;
}
export declare class MediaMessageDto {
    id?: string;
    link?: string;
    caption?: string;
    filename?: string;
}
export declare class LocationMessageDto {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
}
export declare class ContactNameDto {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
}
export declare class ContactPhoneDto {
    phone: string;
    type?: string;
    wa_id?: string;
}
export declare class ContactDto {
    name: ContactNameDto;
    phones?: ContactPhoneDto[];
}
export declare class InteractiveButtonDto {
    type: string;
    id: string;
    title: string;
}
export declare class InteractiveActionDto {
    buttons?: InteractiveButtonDto[];
    button?: string;
    sections?: any[];
}
export declare class InteractiveMessageDto {
    type: string;
    header?: any;
    body: {
        text: string;
    };
    footer?: {
        text: string;
    };
    action: InteractiveActionDto;
}
export declare class TemplateComponentDto {
    type: string;
    parameters?: any[];
}
export declare class TemplateMessageDto {
    name: string;
    language: {
        code: string;
    };
    components?: TemplateComponentDto[];
}
export declare class ReactionMessageDto {
    message_id: string;
    emoji: string;
}
export declare class ContextDto {
    message_id: string;
}
export declare class SendMessageDto {
    to: string;
    type: MessageType;
    text?: TextMessageDto;
    image?: MediaMessageDto;
    audio?: MediaMessageDto;
    video?: MediaMessageDto;
    document?: MediaMessageDto;
    sticker?: MediaMessageDto;
    location?: LocationMessageDto;
    contacts?: ContactDto[];
    interactive?: InteractiveMessageDto;
    template?: TemplateMessageDto;
    reaction?: ReactionMessageDto;
    context?: ContextDto;
}
