import { Op } from "sequelize";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";

const GetWhatsappUserId = async (id: number) => {
  // First try the original approach: User with associated Whatsapp via whatsappId
  const userWithWhatsapp = await User.findOne({
    raw: true,
    nest: true,
    include: [{
        model: Whatsapp,
        attributes: ['id', 'status', 'name', 'companyId', 'wavoip'],
    }],
    where: { id }
  });

  // If user has an associated Whatsapp with wavoip token, return it
  if (userWithWhatsapp?.whatsapp?.wavoip) {
    return userWithWhatsapp;
  }

  // Fallback: find any Whatsapp for this user's company with a wavoip token
  const user = await User.findOne({ attributes: ['companyId'], where: { id } });
  if (user?.companyId) {
    const companyWhatsapp = await Whatsapp.findOne({
      raw: true,
      where: {
        companyId: user.companyId,
        wavoip: { [Op.ne]: null }
      },
      attributes: ['id', 'status', 'name', 'companyId', 'wavoip'],
      order: [['id', 'ASC']]
    });

    if (companyWhatsapp) {
      // Return original user data but with the company's whatsapp
      return {
        ...userWithWhatsapp,
        whatsapp: companyWhatsapp
      };
    }
  }

  return userWithWhatsapp;
};

export default GetWhatsappUserId;
