# Relatório de Correções — 2026-09-07

## 1. Bug: mensagem privada persistia ao trocar de ticket (waiting → open)

**Arquivo:** `frontend/src/components/MessageInput/index.js`

**Causa raiz:** O cleanup do `useEffect([ticketId])` só resetava `privateMessage = false` quando `!isTicketPending()`. Porém, o cleanup roda com os valores do closure anterior — então ao sair de um ticket *pending* para um *open*, `isTicketPending()` ainda retornava `true` e o reset não acontecia. O próximo ticket herdava `privateMessage = true`.

**Correção:** Removida a condição `if (!isTicketPending())` do cleanup, deixando o reset sempre executar. O `useEffect([ticketStatus])` já cuida de reativar o modo privado se o novo ticket for *pending*.

---

## 2. Bug: impossível reagir a figurinhas enviadas pelo próprio usuário

**Arquivos:**
- `backend/src/services/MessageServices/CreateMessageService.ts`
- `backend/src/controllers/MessageController.ts`

**Causa raiz:** Ao enviar uma figurinha, o `MessageController` criava o registro no banco antecipadamente (antes do eco do Baileys) para evitar duplicata no ticket errado. Essa criação não incluía `remoteJid`. Quando o eco do Baileys chegava, o `handleMessage` encontrava a mensagem existente e simplesmente ignorava — sem atualizar `remoteJid`. O campo ficava `null` para sempre.

Ao tentar reagir, `SendWhatsAppReactionService` chamava `wbot.sendMessage(originalMessage.remoteJid, ...)` com `null`, falhando silenciosamente. Para áudio/vídeo o problema não ocorria porque a mensagem é salva pelo próprio eco (que traz `remoteJid` completo).

**Correção:**
- Adicionado `remoteJid?: string` à interface `MessageData` em `CreateMessageService.ts`
- Passado `remoteJid: sentMsg?.key?.remoteJid` na chamada de `CreateMessageService` no controller para stickers

---

## 3. Bug visual: separador "#Chamada - Sem Fila" aparecia ao enviar figurinha

**Arquivo:** `frontend/src/components/MessageInput/index.js`

**Causa raiz:** A mensagem otimista disparada ao enviar figurinha não incluía `ticketId`. A função `renderTicketsSeparator` detectava uma "troca de ticket" (`123 !== undefined`) e exibia o separador cinza com `#Chamada - Sem Fila` até a mensagem real chegar do servidor.

**Correção:** Adicionado `ticketId` ao payload da mensagem otimista, fazendo o separador não renderizar (IDs iguais → sem separador).

---

## 4. Organização: relatórios movidos para `docs/relatorios/`

Todos os arquivos `RELATORIO_*.md` da raiz do projeto foram movidos para `docs/relatorios/`.
