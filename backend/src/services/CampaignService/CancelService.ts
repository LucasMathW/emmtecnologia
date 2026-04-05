import { Op } from "sequelize";
import Campaign from "../../models/Campaign";
import CampaignShipping from "../../models/CampaignShipping";
import { campaignQueue } from "../../queues";

export async function CancelService(id: number) {
  const campaign = await Campaign.findByPk(id);
  await campaign.update({ status: "CANCELADA" });


  // 1. Cancelar jobs DispatchCampaign (jobs de envio efetivo)
  const recordsToCancel = await CampaignShipping.findAll({
    where: {
      campaignId: campaign.id,
      jobId: { [Op.not]: null },
      deliveredAt: null
    }
  });


  const promises = [];

  for (let record of recordsToCancel) {
    try {
      const job = await campaignQueue.getJob(+record.jobId);
      if (job) {
        // Verificar se o job ainda existe antes de tentar remover
        const jobState = await job.getState();
        if (jobState === 'waiting' || jobState === 'delayed') {
          promises.push(job.remove());
        } else {
        }
      } else {
      }
    } catch (error) {
      console.error(`[CANCEL] Erro ao remover job DispatchCampaign ${record.jobId}:`, error.message);
      // Continuar mesmo com erro
    }
  }

  // 2. Para campanhas por TAG, também cancelar jobs PrepareContact que podem estar na fila
  if (campaign.tagListId && !campaign.contactListId) {
    
    try {
      // Buscar todos os jobs na fila que são da campanha atual
      const waitingJobs = await campaignQueue.getWaiting();
      const delayedJobs = await campaignQueue.getDelayed();
      const activeJobs = await campaignQueue.getActive();
      
      const allJobs = [...waitingJobs, ...delayedJobs, ...activeJobs];
      
      
      for (const job of allJobs) {
        try {
          const jobData = job.data;
          
          // Verificar se é um job PrepareContact da campanha atual
          if (jobData && jobData.campaignId === campaign.id && job.name === 'PrepareContact') {
            const jobState = await job.getState();
            if (jobState === 'waiting' || jobState === 'delayed') {
              promises.push(job.remove());
            } else {
            }
          }
        } catch (error) {
          console.error(`[CANCEL] Erro ao processar job ${job.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`[CANCEL] Erro ao buscar jobs na fila:`, error.message);
    }
  }

  // 3. Executar todas as remoções
  try {
    await Promise.all(promises);
  } catch (error) {
    console.error(`[CANCEL] Erro ao remover jobs:`, error.message);
    // Não falhar a operação por causa de jobs que não podem ser removidos
  }

}
