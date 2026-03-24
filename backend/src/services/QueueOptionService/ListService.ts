import { WhereOptions } from "sequelize/types";
import QueueOption from "../../models/QueueOption";

type QueueOptionFilter = {
  queueId: string | number;
  queueOptionId: string | number;
  parentId: string | number | boolean;
};

const ListService = async ({
  queueId,
  queueOptionId,
  parentId
}: QueueOptionFilter): Promise<QueueOption[]> => {
  const whereOptions: WhereOptions = {};
  const parsedParentId = Number(parentId);

  if (queueId) {
    whereOptions.queueId = queueId;
  }

  if (queueOptionId) {
    whereOptions.id = queueOptionId;
  }

  if (!Number.isNaN(parsedParentId) && parsedParentId === -1) {
    whereOptions.parentId = null;
  }

  if (!Number.isNaN(parsedParentId) && parsedParentId > 0) {
    whereOptions.parentId = parsedParentId;
  }

  const queueOptions = await QueueOption.findAll({
    where: whereOptions,
    order: [["id", "ASC"]]
  });

  return queueOptions;
};

export default ListService;
