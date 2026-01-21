import { TemplatesWhatsappService } from './templates-whatsapp.service';
export declare class TemplatesWhatsappController {
    private readonly templatesService;
    constructor(templatesService: TemplatesWhatsappService);
    listTemplates(token: string): Promise<any>;
    getTemplate(token: string, templateName: string): Promise<any>;
    createTemplate(token: string, templateData: any): Promise<any>;
    deleteTemplate(token: string, templateName: string): Promise<any>;
    refreshTemplates(token: string): Promise<any>;
}
