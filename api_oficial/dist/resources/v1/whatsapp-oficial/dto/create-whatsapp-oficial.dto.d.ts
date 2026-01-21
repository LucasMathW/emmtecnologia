export declare class CreateWhatsappOficialDto {
    phone_number_id: string;
    waba_id: string;
    send_token: string;
    business_id: string;
    phone_number: string;
    token_mult100: string;
    idEmpresaMult100: number;
    use_rabbitmq?: boolean;
    rabbitmq_exchange?: string;
    rabbitmq_queue?: string;
    rabbitmq_routing_key?: string;
    chatwoot_webhook_url?: string;
    auth_token_chatwoot?: string;
    n8n_webhook_url?: string;
    auth_token_n8n?: string;
    crm_webhook_url?: string;
    auth_token_crm?: string;
    typebot_webhook_url?: string;
    auth_token_typebot?: string;
}
