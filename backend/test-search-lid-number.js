const { default: makeWASocket, useMultiFileAuthState } = require("baileys");
// OU importe da sua aplicação, dependendo de como está estruturado

// Você precisa usar a sessão JÁ CONECTADA do Baileys
// Então vamos testar via o wbot que já está rodando

// Mas para teste isolado, vamos simular:
console.log("=".repeat(60));
console.log("TESTE: profilePictureUrl via Número vs LID");
console.log("=".repeat(60));

// Este teste precisa ser feito COM a sessão conectada
// Vamos adicionar um log temporário no seu código

console.log("Adicione este log temporário no CreateOrUpdateContactService.ts:");
console.log();
console.log(
  'Antes de: const fetched = await wbot.profilePictureUrl(newRemoteJid, "image");'
);
console.log("Adicione:");
console.log(
  '  console.log("[TESTE] Tentando buscar foto para JID:", newRemoteJid);'
);
console.log('  console.log("[TESTE] LID disponível:", lid);');
console.log();
console.log("Depois do catch, adicione:");
console.log("  if (lid) {");
console.log('    console.log("[TESTE] Tentando buscar foto via LID:", lid);');
console.log("    const start = Date.now();");
console.log("    try {");
console.log(
  '      const fetchedLid = await wbot.profilePictureUrl(lid, "image");'
);
console.log(
  '      console.log("[TESTE] LID funcionou em", Date.now() - start, "ms:", fetchedLid);'
);
console.log("    } catch (e) {");
console.log(
  '      console.log("[TESTE] LID falhou em", Date.now() - start, "ms:", e.message);'
);
console.log("    }");
console.log("  }");
