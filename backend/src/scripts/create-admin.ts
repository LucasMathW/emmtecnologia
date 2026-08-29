// scripts/create-admin.ts
import sequelize from "../database";
import User from "../models/User";
import Company from "../models/Company";

async function createAdminUser() {
  try {
    // Autentica
    await sequelize.authenticate();
    console.log("✅ Conectado ao banco");

    // Verifica empresa
    let company = await Company.findByPk(1);
    if (!company) {
      company = await Company.create({
        id: 1,
        name: "Empresa Principal"
      } as any);
      console.log("✅ Empresa criada");
    }

    // Verifica admin
    const existingAdmin = await User.findOne({
      where: { email: "admin@admin.com" }
    });

    if (existingAdmin) {
      console.log("⚠️ Admin já existe:", existingAdmin.email);
      return;
    }

    // Cria admin
    const admin = await User.create({
      name: "Administrador",
      email: "admin@admin.com",
      password: "admin123",
      profile: "admin",
      companyId: company.id,
      super: true,
      allowGroup: true,
      allTicket: "enabled",
      allHistoric: "enabled",
      allUserChat: "enabled",
      showDashboard: "enabled",
      showCampaign: "enabled",
      showContacts: "enabled",
      allowRealTime: "enabled",
      allowConnections: "enabled",
      allowSeeMessagesInPendingTickets: "enabled",
      showFlow: "enabled",
      userClosePendingTicket: "enabled",
      finalizacaoComValorVendaAtiva: false,
      defaultTheme: "light",
      defaultMenu: "closed",
      defaultTicketsManagerWidth: 550,
      tokenVersion: 0,
      color: "#000000",
      farewellMessage: "Até logo!",
      startWork: "00:00",
      endWork: "23:59",
      lastSeen: new Date()
    } as any);

    console.log("✅ Admin criado com sucesso!");
    console.log("📧 Email:", admin.email);
    console.log("🔑 Senha: admin123");
    console.log("🆔 ID:", admin.id);
  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await sequelize.close();
  }
}

createAdminUser();
