# Relatório de Correções — Performance

## 1. `GET /tickets` — N+1 query no cálculo de `reactionPreview`

### Status: ✅ Corrigido

### Sintoma
Rota `GET /tickets?pageNumber=1&status=...&showAll=...&queueIds=[...]&sortTickets=...`
respondendo entre **5.68s e 5.70s** em produção, mesmo com poucos tickets por página.

### Investigação
Instrumentação com logs `[PERF]` (timers `Date.now()`) no controller
(`backend/src/controllers/TicketController.ts`) e no service
(`backend/src/services/TicketServices/ListTicketsService.ts`) mostrou que o tempo
**não** estava na query principal (`Ticket.findAndCountAll`) nem nas queries
auxiliares (`ShowUserService`, `FindCompanySettingOneService`) — essas juntas
levavam menos de 40ms.

O gargalo real era um loop `for (const ticket of tickets)` executado **depois**
da query principal, que para cada ticket retornado (até 40 por página) disparava
**até 3 queries sequenciais ao banco**:

1. `Message.findOne` — última mensagem do ticket
2. `MessageReaction.findOne` (com JOIN em `Message`) — última reação do ticket
3. `Message.findOne` — busca redundante da mesma mensagem já trazida pelo JOIN do passo 2

Resultado: até **120 round-trips sequenciais ao banco por página**, medidos em
produção como responsáveis por **85–92% do tempo total da rota**:

| Amostra | Tempo do loop N+1 | Tempo total da rota | % do total |
|---|---|---|---|
| 1 | 569ms | 602ms | 94.5% |
| 2 | 650ms | 709ms | 91.7% |
| 3 | 248ms | 273ms | 90.8% |

### Correção aplicada
Arquivo: `backend/src/services/TicketServices/ListTicketsService.ts`

O loop sequencial de até 3 queries por ticket foi substituído por **2 queries em
batch**, usando `WHERE "ticketId" IN (:ticketIds)` / `JOIN ... WHERE "ticketId" IN (:ticketIds)`,
executadas uma única vez para todos os tickets da página (via `sequelize.query`
com `DISTINCT ON`, nativo do Postgres, para pegar a última mensagem/reação de
cada ticket em uma única passada):

- **Batch 1**: última mensagem de cada ticket (`SELECT DISTINCT ON ("ticketId") ... FROM "Messages" WHERE "ticketId" IN (...)`).
- **Batch 2**: última reação de cada ticket, já trazendo o `body` da mensagem
  reagida via `JOIN` (`SELECT DISTINCT ON (m."ticketId") ... FROM "MessageReactions" mr INNER JOIN "Messages" m ...`).
  Isso também eliminou a 3ª query redundante do código original, que buscava de
  novo uma mensagem já obtida pelo JOIN.

O loop original virou um `.map`/`for` **100% em memória** (sem I/O), usando `Map`
para lookup O(1) por `ticketId`. **Nenhuma mudança na lógica de negócio ou no
formato de saída**: o campo `reactionPreview` continua com a mesma estrutura
(`emoji`, `messagePreview`, `reactionUserId`) e a mesma regra de decisão
(reação só aparece se for mais recente que a última mensagem).

Total de queries para o cálculo de `reactionPreview`: de **até 120** (3 × 40
tickets, sequenciais) para **2** (independente do número de tickets na página).

### Instrumentação mantida
Os logs `[PERF]` existentes foram mantidos (mesmos pontos de medição, mesma
label do timer total do loop) para permitir comparação direta antes/depois.
Foram adicionados 2 novos logs, um por query em batch:

```
[PERF][ListTicketsService] batch última mensagem por ticket (1 query no lugar de até N): Xms
[PERF][ListTicketsService] batch última reação por ticket (1 query no lugar de até N): Xms
[PERF][ListTicketsService] loop N+1 pós-query (reactionPreview) [AGORA BATCH: 2 queries totais em vez de até 3xN sequenciais]: Xms
```

### Verificação
- `npx tsc --noEmit -p backend/tsconfig.json` — sem novos erros introduzidos
  (os erros pré-existentes no projeto, em arquivos não relacionados a esta
  mudança, permanecem os mesmos).
- **Confirmado com logs reais** (homologação local, banco de produção
  restaurado): o loop N+1 respondia por **85–92% do tempo total da rota**
  antes da correção. Ver "Investigação" acima para a tabela com as 3 amostras
  medidas.

---

## 2. `GET /messages/:ticketId` — investigado, descartado como gargalo

### Status: ✅ Confirmado rápido — nenhuma ação necessária

Instrumentado e medido em produção/homologação local: **73–215ms**. Não é
fonte de lentidão. Instrumentação `[PERF]` permanece no código
(`backend/src/controllers/MessageController.ts` e
`backend/src/services/MessageServices/ListMessagesService.ts`) sem impacto de
performance perceptível.

---

## 3. `GET /chats` — investigado, correção ainda pendente

### Status: 🔍 Instrumentado, aguardando confirmação com logs reais antes de corrigir

Mesma classe de problema identificada por leitura de código em
`backend/src/services/ChatService/ListService.ts`:

1. `Chat.findAndCountAll` inclui `hasMany` (`users`, `messages`) sem
   `distinct: true`, com risco de multiplicação de linhas do JOIN.
2. Após a query principal, um `Promise.all` dispara **1 query por chat**
   (com 2 JOINs) para achar a última mensagem — com `limit=100`, até 100
   queries concorrentes, podendo saturar o pool de conexões do Sequelize.

Instrumentação `[PERF]` já adicionada em `ChatController.ts` e
`ChatService/ListService.ts`. **Correção ainda não aplicada** — depende dos
logs reais confirmarem esse ponto como o gargalo (mesmo processo usado para
`/tickets`).

---

## 4. Indicador de "digitando…"/"gravando áudio…" parou de funcionar para contatos com identidade `@lid`

### Status: ✅ Corrigido

### Sintoma
Regressão reportada: o indicador de presença (digitando/gravando) de contatos
externos parou de aparecer no frontend. Suspeita inicial era de que alguma
mudança desta sessão (correção do N+1 do `/tickets`, ou correções anteriores
de edição/reação de mensagem, menção `@lid`, foto de perfil, sticker) tivesse
afetado o mecanismo de presença.

### Investigação — descartada relação com mudanças desta sessão
`git diff --stat` do início ao momento do report mostrou que **apenas 6
arquivos** foram tocados nesta sessão (instrumentação `[PERF]` +correção do
N+1 do `/tickets`), nenhum deles relacionado a `presence`, `Baileys`,
`wbot.ev` ou `socket.io`. `git diff | grep -i presence` nos 6 arquivos:
**zero ocorrências**. As correções de edição/reação/menção `@lid`/foto de
perfil/sticker citadas pelo usuário já estavam mescladas **antes** do início
desta sessão (commit `8fb0ff0` e anteriores, visíveis no `gitStatus` inicial
da conversa) — não fazem parte do diff desta sessão.

Com a instrumentação de debug **já existente no código** (`[PRESENCE FLOW][1]
Loop1-raw` em `wbotMessageListener.ts` e `[PRESENCE] ...` em
`HandlePresenceUpdate.ts`), o usuário confirmou nos logs reais que o evento
bruto do Baileys chega normalmente ao backend, mas a cadeia trava em:

```
[DEBUG] [PRESENCE] nenhum ticket ativo — chip: 4 | jid: 101756516184214@lid | grupo: false
```

Isso se repetia mesmo com um ticket ativo real (ID=13359) aberto para aquele
contato, só que o ticket está associado ao contato pelo número tradicional
(`559293404320@s.whatsapp.net`), não pelo LID (`101756516184214@lid`).

### Causa raiz (bug pré-existente, não é regressão desta sessão)
Arquivo: `backend/src/services/WbotServices/HandlePresenceUpdate.ts`, fluxo
individual (não-grupo).

O contato era resolvido diretamente via `Contact.findOne` comparando o
`remoteJid` (que chega como `<lid>@lid`) contra `Contact.remoteJid`,
`Contact.lid` e variações do número. Esse `Contact.findOne` **encontrava**
um registro (por isso o log era "nenhum ticket ativo", não "contato não
encontrado") — mas não necessariamente o contato canônico com o ticket
ativo: o WhatsApp pode reportar presença usando a identidade LID, que nem
sempre está sincronizada 1:1 com o campo `Contact.lid`/`Contact.remoteJid` do
contato "de verdade" (o `LidSyncJob` que sincroniza isso roda em lotes de 10
a cada 5 minutos). O ticket, por sua vez, é buscado por `contactId`, então um
contato resolvido incorretamente nunca acha o ticket certo.

### Tentativa 1 — resolução via `WhatsappLidMap` (insuficiente sozinha)
Antes do `Contact.findOne` existente (mantido como fallback), foi adicionada
uma resolução prioritária via a tabela `WhatsappLidMap` — mesma tabela/padrão
usados em `GetGroupParticipantsService.ts` e `verifyContact.ts`. Corrigiu o
código, mas o teste real (reproduzido pelo usuário) continuou falhando: a
tabela `WhatsappLidMaps` estava **vazia** para esse contato (nunca chegou a
ser criada — ver causa raiz abaixo), então esse caminho nunca era exercido, e
a busca sempre caía no `Contact.findOne` de fallback original.

O teste em **grupo** funcionou nesse ponto, mas isso **não validou a
correção**: o fluxo de grupo resolve o ticket pelo `remoteJid` do próprio
grupo (`@g.us`), nunca passa pelo branch individual onde a correção estava —
confirmado lendo `wbotMessageListener.ts:6246`, que só usa o `@lid` do
membro (`memberJid`) para o rótulo "quem está digitando", não para achar o
ticket.

### Diagnóstico com logs reais → causa raiz definitiva
Com logs de diagnóstico temporários (`console.log`, para não depender de
`debugLog`/`NODE_ENV`) instrumentados no fallback, o usuário reproduziu de
novo e capturou:

```
[PRESENCE-DEBUG] WhatsappLidMap sem entrada para lid=101756516184214 (companyId=3) — tentando fallback Contact.findOne
[PRESENCE-DEBUG] fallback Contact.findOne | remoteJid: 101756516184214@lid | resultado: contato 4193 (Mendes), number=101756516184214, lid=null
```

Query direta no banco confirmou **dois registros de `Contact` para a mesma
pessoa**, criados **9 segundos um do outro**, no mesmo dia dos testes (não é
dado sujo antigo):

| id | number | lid | remoteJid | tickets/mensagens |
|---|---|---|---|---|
| 4193 (fantasma) | `101756516184214` (dígitos do LID, não é telefone) | `null` | `...@s.whatsapp.net` | nenhum, nunca |
| 4194 (real) | `559293404320` (telefone real) | `101756516184214@lid` ✅ | `...@s.whatsapp.net` | todos os tickets/mensagens reais |

O ticket ativo (contactId=4194) nunca era encontrado porque o fallback
`Contact.findOne` usava um único `Op.or` com três critérios independentes
(`remoteJid`, `lid`, `number`) — o contato 4194 batia via `lid`, o 4193 batia
via `number`, e sem `ORDER BY` o Postgres podia devolver qualquer um dos
dois; devolvia o 4193 (o fantasma, sem ticket).

**Causa raiz da duplicidade** — `backend/src/services/WbotServices/verifyContact.ts:232`:
```ts
let originalLid = msgContact.lid || null;
```
Quando o evento chega com identidade **só LID** (`msgContact.id` termina em
`@lid`), o Baileys nem sempre popula `msgContact.lid` separadamente — a
informação já está no próprio `.id`. Sem propagar isso, `originalLid` ficava
`null`, e `CreateOrUpdateContactService` pulava a busca por `lid` (só busca
por `number`, que aqui eram só os dígitos do LID) — criando um contato
"fantasma" toda vez que essa identidade aparecia antes do número de telefone
real ser conhecido. Quando o número real chegava (segundos/minutos depois,
normalmente COM `msgContact.lid` populado), outro contato era criado do
zero em vez de reaproveitar o primeiro.

### Correções aplicadas

**1. Causa raiz — `verifyContact.ts:232`:**
```ts
let originalLid = msgContact.lid || (isLid ? msgContact.id : null);
```
Agora, quando a identidade é só LID, `originalLid` (e portanto
`contactData.lid`) é preenchido com o próprio `.id`. Isso ativa a busca
`if (lid) { Contact.findOne({ where: { lid, companyId } }) }` que já existia
em `CreateOrUpdateContactService.ts` mas nunca era exercida para esse caso —
então, quando o número de telefone real chega logo depois (normalmente já
com `lid` populado), o contato existente é **encontrado e reaproveitado**
em vez de duplicado. Efeito colateral também corrigido: o LID passa a ficar
gravado no contato desde a primeira vez que aparece, então o caminho
prioritário via `WhatsappLidMap`/`Contact.lid` (tentativa 1) passa a
funcionar de verdade.

**2. Camada extra de proteção — `HandlePresenceUpdate.ts`, fallback do fluxo
individual:** o único `Op.or` (`remoteJid`/`lid`/`number`) foi separado em
duas buscas sequenciais por prioridade — primeiro identificador forte
(`remoteJid` ou `lid`, que só deveriam bater no contato certo), e só se isso
não achar nada, busca por `number` (mais fraco/ambíguo — pode ser dígitos de
um LID gravados por engano). Isso não resolve duplicidades já existentes no
banco, mas evita que uma futura duplicidade (de qualquer origem) volte a
quebrar a presença da mesma forma.

**Limitação residual conhecida (não corrigida agora, fora do escopo pedido):**
mesmo com a correção #1, se um contato "fantasma" já foi criado e depois um
evento com número real chega **sem** `msgContact.lid` populado, o
`checkAndDedup` existente (que já mescla nessa direção) só roda no branch
"contato existente" quando o LID é descoberto via `onWhatsAppCached` — não
cobre 100% dos casos. Também: quando um contato-fantasma é reaproveitado via
`lid`, o campo `number` dele nunca é corrigido para o telefone real (não há
lógica de atualização de `number` em `CreateOrUpdateContactService.ts`) —
o registro continua mostrando os dígitos do LID como "number" indefinidamente.
Isso é uma pista relevante para a investigação da foto de perfil pendente
(ver seção 5): se a busca de foto usa `contact.number`/`contact.remoteJid`
de um contato reaproveitado dessa forma, ela pode estar buscando pelo JID
errado.

### Instrumentação
Os logs de debug originais (`[PRESENCE FLOW][1]`, `[PRESENCE] ✅`,
`[PRESENCE] nenhum ticket ativo`, `[PRESENCE] contato não encontrado`) foram
mantidos. Foram adicionados logs `[PRESENCE-DEBUG]` temporários (via
`console.log`, não `debugLog` — ver nota abaixo) para o diagnóstico; ainda
não foram removidos, para permitir validar esta correção também. `[PRESENCE
FLOW][1]` em `wbotMessageListener.ts` passou a imprimir `chatJid`,
`isGroupPresence` e as chaves de `presences` em vez de texto fixo.

**Nota sobre `debugLog` vs `console.log`:** investigado
`backend/src/utils/logger.ts` — `debugLog` só imprime quando
`process.env.NODE_ENV !== "production"`. O `.env` local tem
`NODE_ENV=development`, e o log `[PRESENCE] nenhum ticket ativo` (que usa
`debugLog`) apareceu normalmente nos testes — ou seja, `debugLog` **não**
estava silenciado. Os novos logs `[PRESENCE-DEBUG]` não aparecerem foi
causado por uma **janela de corrida do `ts-node-dev --respawn`**: dois
arquivos foram salvos poucos segundos um do outro, e o processo respawnado
capturou o primeiro save mas não o segundo (evidência: timestamp do processo
rodando batia exatamente com a mtime de um dos arquivos editados, não do
outro, salvo ~20s depois). Trocamos para `console.log` como medida extra de
segurança a pedido do usuário, mas o diagnóstico real era processo
desatualizado, não nível de log — vale sempre confirmar que o dev server
recarregou antes de repetir um teste que "não aparece log nenhum".

### Verificação
- `npx tsc --noEmit -p backend/tsconfig.json` — 23 erros, idêntico ao
  baseline pré-existente do projeto; zero erros novos; nenhum nos arquivos
  alterados (`verifyContact.ts`, `HandlePresenceUpdate.ts`,
  `wbotMessageListener.ts`).
- **Confirmado manualmente pelo usuário**: excluir o contato duplicado 4193
  resolveu a presença imediatamente, validando o diagnóstico da causa raiz.
- **Confirmado com teste real (contato 100% novo)**: reproduzido do zero, foi
  criado **apenas um** registro de `Contact` (id=4196), já com `lid` correto
  desde a criação — zero duplicidade. Log `[PRESENCE] ✅ individual` confirmou
  a presença funcionando corretamente. Correção da causa raiz validada
  ponta a ponta.

---

## 5. Foto de perfil não aparece na lista lateral de tickets (só no cabeçalho)

### Status: ✅ Bug de persistência corrigido — diagnóstico completo, 2 causas identificadas

### Sintoma
Com um contato novo (id=4196, criado após a correção da seção 4), a foto de
perfil aparecia corretamente no **cabeçalho** da conversa aberta, mas **não**
na **lista lateral** de tickets (ícone genérico cinza). Logs do backend
mostravam a busca de foto retornando `null`:
```
[VERIFY-CONTACT] 🔍 BG foto via JID: 101756516184214@lid → null
[VERIFY-CONTACT] 🔍 BG foto via LID: 101756516184214@lid → null
WARN: ⚠️ Foto não disponível para 559293404320 após background fetch
```

### Investigação — duas causas distintas, não a mesma da duplicidade de contato
Query direta no banco confirmou que **nenhuma tentativa de foto persistiu**
para o contato 4196 (`profilePicUrl` e `urlPicture` vazios, `updatedAt`
idêntico a `createdAt` — nenhum `.update()`/`.save()` bem-sucedido desde a
criação).

**Causa A — cache no navegador mascarando o cabeçalho (não é bug de backend):**
`frontend/src/components/Ticket/index.js` mantém um cache em
`localStorage["contactPics"]`, indexado por **número de telefone**
(`${companyId}-${number}`), que **sobrepõe** o que a API retorna fresca. Como
o mesmo número de telefone real foi testado várias vezes nesta sessão com
contatos diferentes (4193 → 4194 → 4196), uma foto obtida com sucesso em
teste anterior ficou "presa" nesse cache e era aplicada ao contato novo,
mesmo sem nenhuma foto real ter sido salva para ele. A lista lateral
(`TicketsListCustom`) não tem esse cache — por isso mostrava o estado real
(vazio). **Ação do usuário**: limpar esse `localStorage` antes do próximo
teste (sem necessidade de mudança de código).

**Causa B — bug real de persistência no backend (corrigido nesta seção):**
`backend/src/services/ContactServices/CreateOrUpdateContactService.ts` tinha
**3 ocorrências** do mesmo anti-padrão já documentado (e já corrigido) em
`ForceProfilePicRefresh.ts`:
```ts
await contact.update({ urlPicture: filename, ... }); // ❌ não persiste
```
`urlPicture` é um **getter Sequelize sem setter** no model (`Contact.ts`) —
atribuir a essa propriedade via `.update()`/atribuição direta é
silenciosamente descartado pelo JS (propriedade só-leitura), enquanto os
outros campos do mesmo `.update()` (ex: `profilePicUrl`, `pictureUpdated`,
colunas comuns) persistem normalmente. Resultado: **mesmo quando a busca de
foto funciona, o campo que os componentes de frontend efetivamente usam para
renderizar (`urlPicture`) nunca é salvo no banco** — só aparecia ao vivo via
socket, quando o payload emitido reconstruía `urlPicture` manualmente
(mascarando o problema, como no cabeçalho).

**Não investigado nesta sessão (a pedido do usuário)**: por que a busca de
foto retornou `null` para o teste específico do contato 4196. Pode ser
timing/propagação do WhatsApp ou privacidade do contato — não necessariamente
um bug.

### Correção aplicada
Arquivo: `backend/src/services/ContactServices/CreateOrUpdateContactService.ts`
— as 3 ocorrências trocadas para o padrão já validado em
`ForceProfilePicRefresh.ts`:
```ts
contact.setDataValue("urlPicture", filename);
contact.setDataValue("profilePicUrl", ...);   // quando aplicável
contact.setDataValue("pictureUpdated", true);
await contact.save();
```
Localizações corrigidas:
1. Linha ~380 — bloco `PIC-BG` (fire-and-forget na criação de contato via `verifyContact.ts`/mensagem).
2. Linha ~725 — bloco `PIC-ASYNC` (`downloadProfilePicture`, disparado quando `updateImage` é true).
3. Linha ~765 — atualização síncrona final do mesmo bloco `updateImage`.

Verificado que `Contact.create({..., urlPicture: "", ...})` (linhas ~540 e
~614, contatos novos) **não** tem esse problema — `create()`/`build()` grava
os valores iniciais direto, sem passar pelo getter/setter da instância, então
não precisou de alteração. Nenhum outro arquivo do backend tinha o mesmo
anti-padrão (busca confirmou as 3 ocorrências, todas neste arquivo).

**Fora do escopo, não alterado**: na correção 3, o valor salvo em
`profilePicUrl` é `filename` (nome do arquivo local, ex. `"4196.jpeg"`), não
a URL original do WhatsApp — comportamento pré-existente, preservado
intencionalmente para não alterar nada além do pedido.

### Verificação
- `npx tsc --noEmit -p backend/tsconfig.json` — 23 erros, idêntico ao
  baseline; zero novos; nenhum em `CreateOrUpdateContactService.ts`.
- Ainda não testado com um contato novo em produção/homologação — usuário vai
  limpar o `localStorage` do navegador de teste (causa A) e reproduzir de
  novo para confirmar que, quando o WhatsApp retornar a foto com sucesso, ela
  agora persiste corretamente e aparece também na lista lateral.

---

## 6. Envio de PDF/áudio/imagem — investigado, causa provável fora do código

### Status: ✅ Investigado — não requer correção de código nesta sessão

### Fluxo mapeado
`POST /messages/:ticketId` (com `medias`) →
`multer` (`upload.array("medias")`, `diskStorage`) →
`MessageController.store` →, por mídia:
- `isSticker=true` → `SendMessageSticker.ts` (conversão `sharp` → `wbot.sendMessage`)
- canal `whatsapp` → `SendWhatsAppMedia.ts` (conversão `ffmpeg` quando aplicável → `wbot.sendMessage`)
- canal `whatsapp_oficial` / `facebook`/`instagram` → outros services (não
  instrumentados nesta rodada — o usuário só vai testar PDF/áudio/imagem via
  WhatsApp normal/sticker).

### Possíveis gargalos identificados por leitura de código (a confirmar com os logs)
1. **Conversão de áudio via `ffmpeg`** (`convertAudioToOggOpus`, em
   `SendWhatsAppMedia.ts`) — spawna um processo `ffmpeg` externo
   (`audioCodec("libopus")`, `audioBitrate("64k")`) para **todo** áudio que
   não seja já `.ogg`. Isso inclui potencialmente todo áudio gravado no
   navegador do atendente (dependendo do formato) — candidato natural a
   gargalo para o cenário de áudio.
2. **Conversão de imagem via `ffmpeg`** (`convertPngToJpg`) — roda para
   **todo** PNG/WebP (ex: prints de tela, muito comuns), convertendo para
   JPEG via subprocesso `ffmpeg`. Mesma classe de risco do áudio.
3. **Leitura síncrona de arquivo** (`fs.readFileSync`) em todos os branches
   (vídeo, áudio, documento, imagem) — é **bloqueante para o event loop
   inteiro do Node**, não só para essa requisição. Para um PDF grande, isso
   pode travar temporariamente todas as outras requisições sendo atendidas
   pelo mesmo processo Node, não só a do próprio envio.
4. **`wbot.sendMessage`** — chamada de rede real ao WhatsApp via Baileys;
   variável por natureza (tamanho do arquivo, latência da conexão), mas é o
   "custo esperado" e não deveria por si só ser o problema, a menos que a
   conexão do WhatsApp esteja degradada.
5. **`getWbot`** faz um `Whatsapp.findByPk` (DB) a cada chamada, tanto em
   `SendWhatsAppMedia.ts` quanto em `SendMessageSticker.ts` — provavelmente
   rápido, mas medido para descartar.
6. Upload em si (`multer`, `diskStorage`) roda **antes** do controller —
   inclui o tempo de rede do upload (cliente → servidor) mais a escrita em
   disco; medido separadamente para não confundir com o processamento.

### Resultado medido (logs reais, ambiente local)
Testes reais de PDF, áudio e imagem confirmaram os números:

- **Tempo total por mídia: 674ms–1049ms.**
- **86–98% desse tempo estava concentrado em `wbot.sendMessage`** (a chamada
  de rede real ao Baileys/WhatsApp) — não nas conversões `ffmpeg`/`sharp` nem
  na leitura de disco, que os logs `[PERF]` isolaram separadamente e
  mostraram desprezíveis na comparação.

### Conclusão
Verificado que **não existe nenhum timeout, retry ou backoff no código em
volta de `wbot.sendMessage`** em `SendWhatsAppMedia.ts` nem em
`SendMessageSticker.ts` (nenhum `Promise.race`/`setTimeout` envolvendo essa
chamada — diferente de outros pontos do sistema, como o fetch de foto de
perfil, que têm retry). Ou seja: o tempo medido é o tempo bruto da própria
chamada de rede ao WhatsApp, sem nenhuma lógica intermediária no nosso código
que o esteja inflando artificialmente.

Com 86–98% do tempo total dentro de uma única chamada de rede de saída
(cliente Baileys → servidores do WhatsApp), a causa provável é
**infraestrutura/rede da VPS** (latência de rede, largura de banda de saída,
ou proximidade geográfica/roteamento até os servidores do WhatsApp) — **não
código da aplicação**. Não há, portanto, nenhuma correção de código a propor
nesta rodada; um valor de 674ms–1049ms para enviar um arquivo de mídia via
uma API de mensageria por chamada de rede síncrona está dentro do que se
espera fisicamente, e não há gargalo artificial introduzido pelo backend.

**Se a lentidão persistir como problema real em produção** (não só na medição
local), os próximos passos deixariam de ser "revisar código" e passariam a
ser: medir a latência de rede da VPS até os servidores do WhatsApp
diretamente (ex: `ping`/`traceroute`/`curl -w`), verificar a banda de saída
disponível na VPS, e comparar com o tempo medido em produção via os mesmos
logs `[PERF]` (mantidos no código) para confirmar se o padrão
"quase-tudo-em-wbot.sendMessage" se repete lá.

### Instrumentação adicionada (mantida no código, não removida)
Logs `[PERF]` (mesmo padrão das correções anteriores) em 4 arquivos:

- **`backend/src/routes/messageRoutes.ts`** — tempo do middleware `multer`
  (`upload.array("medias")`): recebimento do upload + escrita em disco,
  incluindo nome/tamanho de cada arquivo.
- **`backend/src/controllers/MessageController.ts`** (`store`) —
  `ShowTicketService`; tempo de processamento de **cada mídia** individual
  (sticker ou envio normal, com mimetype/tamanho/canal); total de todas as
  mídias da requisição.
- **`backend/src/services/WbotServices/SendWhatsAppMedia.ts`** — `getWbot`;
  `Message.findOne` (quotedMsg, se houver); `convertAudioToOggOpus` (ffmpeg,
  isolado); `convertPngToJpg` (ffmpeg, isolado); tempo total de preparação da
  mídia (conversão + `fs.readFileSync`, com o branch usado no rótulo do log);
  `wbot.sendMessage` (rede/Baileys, isolado); `ticket.update`; total da
  função.
- **`backend/src/helpers/SendMessageSticker.ts`** — `getWbot`;
  `Contact.findByPk`; `convertToSticker` (sharp, isolado); `wbot.sendMessage`
  (rede/Baileys, isolado); total da função.

Todos os logs incluem o mimetype/tamanho do arquivo para poder cruzar
"PDF grande foi lento por causa de X" vs "áudio foi lento por causa de Y".

### Verificação
- `npx tsc --noEmit -p backend/tsconfig.json` — 23 erros, idêntico ao
  baseline; zero novos; nenhum nos 4 arquivos instrumentados.
- Nenhuma lógica de negócio alterada — só `console.log` de tempo adicionados.
- **Confirmado com logs reais**: 674ms–1049ms total, 86–98% em
  `wbot.sendMessage`, sem timeout/retry no código. Seção fechada como
  "investigado, causa provável fora do código".

---

## 7. Participantes do grupo "(0)" + autocomplete de menção `@` vazio

### Status: ✅ Corrigido (whatsappId desatualizado + nome cru/LID no autocomplete)

### Sintomas reportados
1. Painel "Participantes do Grupo (0)" / "Nenhum participante encontrado" em
   um grupo ativo com mensagens recentes (grupo "Doc. Mendes").
2. Digitar `@` no campo de mensagem de um ticket de grupo não mostra nenhuma
   sugestão de contato para menção.
3. Logs repetidos ao longo da sessão:
   ```
   [GetGroupParticipantsService] ERROR getting wbot: ERR_WAPP_NOT_INITIALIZED
   [GetGroupParticipantsService] ERROR in main try-catch: forbidden
   ```

### Investigação — os dois sintomas têm a MESMA causa raiz
Confirmado lendo o frontend: os dois pontos de UI chamam exatamente a mesma
rota do backend, cada um tratando erro de forma diferente (mas ambos
resultando em lista vazia):

- `frontend/src/components/ContactDrawer/index.js:471` (painel de
  participantes) → `GET /contacts/:contactId/participants`
- `frontend/src/components/MessageInput/index.js:713` (autocomplete de
  menção, carrega `groupParticipants` num `useEffect` quando
  `ticketStatus === "group"`) → **a mesma rota**
  `GET /contacts/:contactId/participants`, com o erro **capturado e
  silenciado** (`catch (e) { // silencioso }`) — por isso o campo de menção
  não mostra nenhum aviso, só fica vazio. A filtragem de sugestões só roda
  `if (groupParticipants.length > 0)`, então com a lista vazia o `@` nunca
  produz nada.

Ambas as rotas caem em `ContactController.getGroupParticipants` →
`GetGroupParticipantsService.ts`. **Não são bugs independentes — é o mesmo
serviço de backend falhando, consumido em dois lugares do frontend.**

### Causa raiz do backend
`GetGroupParticipantsService.ts` decide qual conexão WhatsApp (`wbot`) usar
para consultar o grupo assim:
```ts
if (contact.whatsappId) {
  wbot = await getWbot(contact.whatsappId);   // usa o whatsappId gravado no Contact do grupo
} else {
  ...GetDefaultWhatsApp...
}
```

Query direta no banco confirmou o problema:

| Fonte | whatsappId | Observação |
|---|---|---|
| `Contact` do grupo "Doc. Mendes" (id=4086) | **3** ("Chip - CPI") | **status `DISCONNECTED`** neste ambiente local |
| Ticket mais recente do grupo (id=11670, `status=group`, última mensagem hoje) | **4** ("Chip - Mendes") | **único chip `CONNECTED`** neste ambiente |

O `Contact.whatsappId` do grupo está **desatualizado** — aponta para uma
conexão (chip 3) que não é mais a que efetivamente movimenta esse grupo
(confirmado pelas mensagens recentes reais, todas via chip 4). Isso explica
exatamente os dois erros observados, em momentos diferentes:

1. **`ERR_WAPP_NOT_INITIALIZED`**: quando o chip 3 está desconectado (como
   está agora), `getWbot(3)` não encontra sessão ativa em memória e lança
   esse erro — capturado no `try/catch` de `getWbot` do service (linha
   ~71) e relançado como `AppError("WhatsApp não encontrado ou
   desconectado", 500)`.
2. **`forbidden`**: em algum momento em que o chip 3 esteve conectado (ex:
   em produção, onde provavelmente mais chips ficam ativos
   simultaneamente), `getWbot(3)` teria sucesso, mas `wbot.groupMetadata(remoteJid)`
   (linha ~79) falha com `"forbidden"` — **não é uma restrição de permissão
   da API do WhatsApp em geral**, é o WhatsApp recusando a consulta porque
   **a conta do chip 3 não é membro desse grupo** (o grupo real, no
   WhatsApp, só tem o chip 4 como membro). É o comportamento esperado do
   WhatsApp ao perguntar sobre um grupo para uma conta que nunca esteve
   nele — não um bug de permissão a ser contornado, é sintoma da mesma causa
   raiz (whatsappId errado).

Ou seja: **`forbidden` e `ERR_WAPP_NOT_INITIALIZED` não são dois problemas
diferentes** — são o mesmo bug (`Contact.whatsappId` desatualizado) se
manifestando de forma diferente dependendo de qual chip estiver
conectado/desconectado no momento da consulta.

### Por que o `whatsappId` do `Contact` ficou desatualizado
Não investigado a fundo nesta rodada (fora do pedido de "não corrigir
ainda"), mas o padrão é o mesmo já visto nas seções 4–5 deste relatório:
campos de identidade em `Contact` (lá era `lid`/`number`; aqui é
`whatsappId`) não são corrigidos quando a realidade no WhatsApp muda — nesse
caso, o grupo aparentemente passou a ser usado por um chip diferente do que
originalmente criou/importou o `Contact`, e nada no código atualiza
`Contact.whatsappId` para refletir isso. Ticket já reflete o chip correto
(4); o `Contact` do grupo, não.

### Correção aplicada: fallback + auto-correção do `whatsappId`
Arquivo: `backend/src/services/ContactServices/GetGroupParticipantsService.ts`.

1. **Tenta normalmente** com `contact.whatsappId` (ou o whatsapp padrão da
   empresa, se o contato não tiver um) — comportamento atual preservado
   para os casos que já funcionam.
2. **Se `getWbot()` lançar `ERR_WAPP_NOT_INITIALIZED` OU
   `wbot.groupMetadata()` lançar `"forbidden"`**, busca o `whatsappId` do
   **ticket mais recente** desse grupo (`Ticket.findOne({where: {contactId,
   companyId}, order: [["updatedAt", "DESC"]]})`) e tenta de novo com esse
   chip.
3. **Se o fallback funcionar**, além de retornar os participantes, executa
   `contact.update({ whatsappId: fallbackWhatsappId })` — auto-correção do
   `Contact`, mesmo padrão já aplicado para `lid`/`number` nas seções 4–5.
   Consultas futuras para esse grupo não precisam mais do fallback.
4. **Se o fallback também falhar**, mantém o erro (mapeado pelas mesmas
   regras de antes: `not_found`/`item-not-found` → 404, `Connection
   Closed`/`not_connected` → 503, senão → 500 com a mensagem original) — não
   força sucesso onde não há.

Toda a lógica de processamento de participantes (extração de LID, matching
por `Contact`, ordenação) foi **preservada intacta** — só a resolução de
`wbot`/`groupMetadata` foi reestruturada.

---

### 7.1 Nome cru (LID) no autocomplete de menção — dois bugs de matching + gap de dado

Depois da correção do `whatsappId`, os participantes passaram a carregar,
mas alguns ainda apareciam com o LID numérico cru em vez do nome (ex:
`101756516184214` em vez de `Mendes`), diferente do WhatsApp oficial (que
mostra o nome de perfil mesmo para contatos não salvos na agenda).

#### Investigação — Baileys não expõe nome de participante em `groupMetadata()`
Confirmado lendo o código-fonte do Baileys instalado
(`node_modules/baileys/lib/Socket/groups.js`, função `extractGroupMetadata`):
a resposta real do WhatsApp para a consulta de metadados de grupo só contém
`jid`/`phone_number`/`lid`/`username`(@username público)/`type`(admin) por
participante — **nunca nome**. O tipo TypeScript `GroupParticipant` estende
`Contact` (que tem `name`/`notify`/`verifiedName`) só por reaproveitamento de
interface; na prática esses campos nunca vêm preenchidos por essa chamada.
`pushName` (o nome que a pessoa define no próprio perfil, o que o WhatsApp
oficial mostra) só existe no protocolo dentro de mensagens (`msg.pushName`,
evento `messages.upsert`) — não há nenhuma chamada Baileys que busque isso
sob demanda para um participante que nunca mandou mensagem.

Ou seja: **não existe uma forma direta de replicar 100% o comportamento do
app oficial** (que tem acesso a um canal interno do WhatsApp não exposto a
clientes não-oficiais). O que dá pra fazer é usar melhor os dados que o
sistema já tem.

#### Item 1 — dois bugs reais de matching (confirmados com caso de teste real)
Usando 3 participantes reais do grupo "Doc. Mendes" que já haviam mandado
mensagem (contatos 361 "EMM TECNOLOGIA", 4094 "Alencar M", ambos com
`Contact.lid` corretamente preenchido), simulei a lógica exata do código
existente contra o banco e confirmei **dois bugs distintos**, nenhum deles
falta de dado:

**Bug A — `WhatsappLidMap.findOne` comparava contra o formato errado.**
```ts
// código antigo:
const lidMap = await WhatsappLidMap.findOne({ where: { lid: number, companyId } });
// "number" = só dígitos (ex: "39428454142072")
```
Mas `WhatsappLidMap.lid` é **sempre** gravado com o JID completo
(`"39428454142072@lid"`) em **todos** os pontos de criação
(`verifyContact.ts`, `queues.ts`, `scripts/populateContactLids.ts` — todos
usam o valor de `wbot.onWhatsApp().lid` direto, sem stripar o sufixo).
Resultado: essa consulta **nunca batia com nenhuma linha real**, mesmo
quando existia um mapeamento perfeitamente válido — sempre caía pro
fallback de full-scan.

**Bug B — o full-scan de fallback tinha um `limit: 1000` sem `ORDER BY`.**
```ts
const allContacts = await Contact.findAll({
  where: { companyId, isGroup: false },
  limit: 1000   // ← sem ORDER BY, ordem arbitrária do Postgres
});
```
A empresa testada tem **3049 contatos** não-grupo. Sem `ORDER BY`, o
Postgres devolve os 1000 primeiros em ordem física arbitrária — confirmado
que os contatos 361 e 4094 **não estavam nem entre os primeiros 2000**
retornados nessa ordem. O branch irmão (não-LID, mais abaixo no mesmo
arquivo) já faz a mesma busca **sem limite** — o limite só existia no
branch LID, inconsistente com o resto do próprio arquivo.

Também removida uma query morta (`const contactByLid = await
Contact.findOne(...)`, sem filtro específico nenhum, cujo resultado nunca
era usado em lugar nenhum) — custo de mais uma query por participante à toa.

#### Item 2 — Nível 3: `pushName` do histórico de mensagens
Para o caso que sobrou mesmo depois do item 1 (contato 4081: sem `lid`
vinculado, `name` já era literalmente os dígitos do LID — genuína falta de
dado, não bug de busca), implementado o fallback combinado: busca a última
`Message` desse participante (`Message.participant` guarda o mesmo JID usado
em `groupMetadata`, ex: `"120036417097788@lid"`), parseia o `dataJson` bruto
(já salvo por `wbotMessageListener.ts` desde sempre) e extrai `pushName` —
o mesmo campo que o próprio sistema já usa para preencher `Contact.name` ao
processar mensagens, só que agora também usado como fallback quando o
`Contact` daquele LID nunca ficou vinculado corretamente.

```ts
const resolvePushNameFromHistory = async (participantJid: string) => {
  const lastMessage = await Message.findOne({
    where: { companyId, participant: participantJid },
    order: [["createdAt", "DESC"]],
    attributes: ["dataJson"]
  });
  if (!lastMessage?.dataJson) return null;
  const pushName = JSON.parse(lastMessage.dataJson)?.pushName;
  return typeof pushName === "string" && pushName.trim() !== "" ? pushName.trim() : null;
};
```
Usado nos dois pontos onde antes o código desistia e caía direto pro
número/LID cru. Se nem isso encontrar nada (participante nunca mandou
mensagem em lugar nenhum do sistema), o comportamento final continua sendo
mostrar o número/LID — não tem outra fonte de dado possível nesse caso.

#### Validação empírica (antes de qualquer teste manual)
Simulei a lógica corrigida (via SQL direto, sem alterar nada) contra os
mesmos 3 casos reais:

| Participante (LID) | Antes | Depois | Via |
|---|---|---|---|
| `39428454142072@lid` | LID cru | **EMM TECNOLOGIA** | `WhatsappLidMap` (bug A corrigido) |
| `191006288932913@lid` | LID cru | **Alencar M** | full-scan sem limite (bug B corrigido) |
| `120036417097788@lid` | LID cru | **Edney Mendes** | Nível 3 — `pushName` do histórico |

Os 3 casos reais testados resolveram para nomes corretos.

### Verificação
- `npx tsc --noEmit -p backend/tsconfig.json` — 23 erros, idêntico ao
  baseline; zero novos; nenhum em `GetGroupParticipantsService.ts`.
- Nenhuma alteração na lógica de `whatsappId`/fallback já corrigida (seção
  acima) — só a parte de resolução de nome do participante.
- **Validado com simulação da lógica real contra o banco de produção
  restaurado** (3 participantes reais do grupo "Doc. Mendes") — todos os 3
  resolveram para o nome correto.
- **Confirmado pelo usuário testando na interface real**: nomes corretos
  aparecendo no autocomplete de menção ("Mendes", "Edney Mendes", "Alencar
  M", "EMM TECNOLOGIA").

---

### 7.2 Opção "Todos" (@all) no autocomplete de menção

#### Status: ✅ Implementado

#### Investigação de viabilidade (antes de aplicar)
Confirmado que **não existe um JID especial de "everyone" no protocolo do
WhatsApp** — o "Marcar todos" do app oficial é só um recurso de UX: ele
popula a lista de menções da mensagem com o JID de **cada membro do grupo**,
um por um. O Baileys já suporta isso nativamente, sem nada especial: o campo
`mentions?: string[]` (`node_modules/baileys/lib/Types/Message.d.ts:74`) do
`AnyMessageContent` aceita qualquer array de JIDs, sem limite documentado —
e nosso backend **já envia esse array para o Baileys** tanto em texto
(`SendWhatsAppMessage.ts`, campo `mentions`) quanto em mídia
(`SendWhatsAppMedia.ts`, `contextInfo.mentions`). Ou seja: a funcionalidade é
100% viável só no frontend, reaproveitando o mecanismo de `mentionedJids`
que já existe — **nenhuma mudança de backend foi necessária**.

#### Implementação
Arquivo: `frontend/src/components/MessageInput/index.js`.

1. Novo marcador de UI `MENTION_ALL_OPTION` (`{ id: "__mention_all__", name:
   "Todos", isMentionAll: true }`) — não é um participante real, só um item
   de lista.
2. `handleChangeInput`: esse marcador é colocado **no topo** de
   `mentionSuggestions` sempre que o texto digitado depois do `@` bater com
   o começo de "todos" ou "all" (ou estiver vazio) — mesmo comportamento do
   WhatsApp nativo (aparece por padrão, some se o usuário digitar algo que
   não combina com nenhuma das duas palavras).
3. `handleMentionSelect`: ao selecionar essa opção, insere `@Todos ` no
   texto e, em vez de adicionar um único JID a `mentionedJids`, adiciona o
   JID de **todos** os `groupParticipants` (`${p.number}@s.whatsapp.net`),
   deduplicado com `Set`. Participantes individuais continuam funcionando
   exatamente como antes (branch separado, comportamento não alterado).
4. Renderização: ícone de grupo (`GroupIcon`) em vez de foto/inicial, e
   subtítulo "Mencionar todos (N participantes)" em vez de número/Admin.

Nenhuma mudança na lógica de resolução de nomes (seção 7.1) ou de
`whatsappId`/fallback (seção 7) — arquivo/lógica intactos além desta adição.

#### Verificação
- Sintaxe validada via Babel com o preset real do projeto
  (`babel-preset-react-app`, o mesmo do `react-scripts`) — parse/transform
  bem-sucedido, sem erros. (`tsc --noEmit` não se aplica: é um arquivo `.js`,
  não TypeScript.)
- `npx tsc --noEmit -p backend/tsconfig.json` — 23 erros, idêntico ao
  baseline (nenhum arquivo de backend alterado nesta subseção).
- **Limitação pré-existente identificada, não introduzida por esta mudança**:
  o fluxo de envio de **mídia com legenda** (`handleSendMedias`, por volta da
  linha 1312) não anexa `mentionedJids` ao `FormData` — ou seja, menções
  (incluindo "Todos") só funcionam hoje em mensagens de **texto puro**, não
  em mídia com legenda. Isso já era assim antes desta mudança (menção
  individual tem a mesma limitação) — não foi alterado, só documentado aqui
  para não ser confundido com um bug novo.
- Aguardando teste do usuário na interface real.

---

## 8. Reações de contatos externos em mensagens de grupo não aparecem na plataforma

### Status: ✅ Corrigido

### Sintoma
Reações (emoji) adicionadas por contatos externos a mensagens dentro de
tickets de **grupo** não apareciam na plataforma. O mesmo fluxo, em
conversas **individuais**, funcionava normalmente.

### Investigação
Handler identificado: `handleBaileysReaction` em
`backend/src/services/WbotServices/wbotMessageListener.ts`, chamado tanto a
partir de `messages.upsert` (quando `msg.message?.reactionMessage` vem
embutido) quanto do evento dedicado `messages.reaction` — ambos delegam para
`CreateOrUpdateBaileysReactionService.ts`. Não havia nenhum filtro explícito
de grupo (`remoteJid.includes("@g.us")`) descartando a reação; o log
temporário `[REACTION-GROUP]` adicionado em `handleBaileysReaction`
confirmou que o payload bruto do Baileys chega corretamente ao backend, com
`participant` no formato `"<dígitos>@lid"` (ex:
`101756516184214@lid`) — a identidade LID do WhatsApp, não o número de
telefone real do contato (`559293404320`).

A resolução do "quem reagiu" (`CreateOrUpdateBaileysReactionService.ts`,
função `resolveReactionActor`, branch de reação de **contato externo**
— `isFromMe === false`) fazia:
```ts
const normalizedJid = normalizeJid(rawJid);          // "<dígitos>@lid" → "<dígitos>@s.whatsapp.net"
const number = normalizedJid.replace(/\D/g, "");      // "101756516184214"
const contact = await Contact.findOne({ where: { number, companyId } });
if (!contact) return null;                             // ← reação descartada aqui
```
`normalizeJid()` (utilitário compartilhado, `backend/src/utils/index.ts`)
só troca o domínio de um jid `@lid` para `@s.whatsapp.net` — não resolve os
dígitos do LID para o telefone real. Como `Contact.number` guarda o telefone
de verdade (`559293404320`), a busca por `number = "101756516184214"` nunca
batia, `contact` vinha `null`, `resolveReactionActor` retornava `null`, e
`CreateOrUpdateBaileysReactionService` fazia early-return
(`if (!actor) return;`) **sem gravar nem emitir nada** — silenciosamente.
Mesma classe de bug já documentada nas seções 4 e 7.1 deste relatório (dígitos
de LID tratados como se fossem número de telefone), agora localizada num
terceiro ponto do código que nunca consultava `WhatsappLidMap`/`Contact.lid`.

Reações individuais não sofriam disso porque, em chat 1:1, o jid do reator
já chega como `@s.whatsapp.net` (ou o `remoteJid` do contato, já sincronizado
por outros fluxos) — o caminho `@lid` só é exercido quando o `participant`
de um membro de grupo vem identificado por LID.

### Correção aplicada
Arquivo: `backend/src/services/MessageServices/CreateOrUpdateBaileysReactionService.ts`.

1. `parseReactionPayload` agora captura, a partir do `rawJid` **antes** da
   normalização, se é um jid `@lid` (`isLid`) e os dígitos do LID
   (`lidDigits`).
2. `resolveReactionActor` (branch de contato externo): quando `isLid` é
   verdadeiro, resolve o contato **antes** de cair no `Contact.findOne({
   number })` antigo (mantido como fallback final), na mesma ordem de
   prioridade já usada em `verifyContact.ts` / `GetGroupParticipantsService.ts`:
   1. `Contact.findOne({ where: { lid: "<dígitos>@lid" | "<dígitos>" , companyId } })`
   2. `WhatsappLidMap.findOne({ where: { lid: "<dígitos>@lid" | "<dígitos>", companyId }, include: Contact })`
   3. Fallback: `Contact.findOne({ where: { number, companyId } })` (comportamento antigo, preservado).
3. Quando o contato é resolvido via `@lid`, o `fromJid` gravado/emitido passa
   a usar `getJidOf(contact)` — mesmo helper já usado em
   `SendWhatsAppMedia.ts`/`SendMessageSticker.ts` (prioriza `contact.remoteJid`
   válido, senão `contact.number` real) — em vez do jid `@lid` cru, para a
   reação ficar consistente com a identidade usada no fluxo de mensagens
   individuais (item 5 do pedido).
4. Log `[REACTION-GROUP-LID]` adicionado indicando se o `@lid` foi resolvido
   (com `contactId`/nome) ou não encontrado em nenhuma das fontes.

Nenhuma outra lógica do serviço foi alterada: reação de agente (`isFromMe`),
remoção de reação (`handleRemoveReaction`), emissão de socket
(`emitAppMessageReactionUpdate`/`emitTicketUpdate`) e o fluxo de reação
individual (`isLid === false`, cai direto no `Contact.findOne({ number })`
de sempre) permanecem intactos.

### Verificação
- `npx tsc --noEmit -p backend/tsconfig.json` — sem erros novos em
  `CreateOrUpdateBaileysReactionService.ts` (baseline do projeto inalterado).
- Log `[REACTION-GROUP]` (investigação) mantido em `wbotMessageListener.ts`;
  novo log `[REACTION-GROUP-LID]` adicionado em
  `CreateOrUpdateBaileysReactionService.ts` para confirmar em produção que o
  `@lid` está sendo resolvido para o contato certo.
- Aguardando confirmação do usuário reproduzindo uma reação de grupo real
  (contato Mendes, `101756516184214@lid` → `559293404320`) na interface.

---

## 9. Criação de novo ticket bloqueada mesmo em conexão (whatsappId) diferente

### Status: ✅ Corrigido

### Sintoma
Contato "Mendes" com atendimento **aberto** na conexão "EMM TECNOLOGIA"
(whatsappId X). Ao tentar criar um **novo** ticket para o mesmo contato numa
conexão **diferente** ("Chip-Mendes", whatsappId Y, fila "Coord. CPI") pelo
modal "Criar Ticket", o sistema bloqueava com "Atendimento Existente — Este
contato já está em atendimento", mesmo sendo canais/chips distintos.

### Investigação
Fluxo mapeado: `NewTicketModal` (frontend) → `POST /tickets` →
`TicketController.store` → `CreateTicketService.ts` →
`CheckContactOpenTickets(contactId, defaultWhatsapp.id)`
(`backend/src/helpers/CheckContactOpenTickets.ts`) — é essa função que lança
o erro 409 que o `TicketController` converte em 403 ("Ticket já existe"),
disparando o modal `ShowTicketOpenModal` no frontend.

A query da verificação **não filtrava por `whatsappId`**:
```ts
const ticket = await Ticket.findOne({
  where: {
    contactId,
    status: { [Op.or]: ["open", "pending", "chatbot"] }
    // Removido o filtro por whatsappId — verifica conflito em qualquer conexão
  },
  ...
});
```
A função recebia `whatsappId` como parâmetro (e `CreateTicketService.ts` já
passava o valor correto, `defaultWhatsapp.id`, refletindo o chip selecionado
no modal) — mas o parâmetro nunca era usado no `where`, então **qualquer**
ticket aberto/pendente/chatbot do contato, em **qualquer conexão**, bloqueava
a criação de um novo.

`git log -p` no arquivo mostrou que isso não era um bug antigo nunca
corrigido: o filtro por `whatsappId` **existia** e foi removido de propósito
no commit `b118b68` ("fix: build apiController"), trocando "bloqueia na
mesma conexão" por "bloqueia em qualquer conexão" — exatamente o
comportamento que o usuário pediu para reverter.

**Nota lateral (não é a causa):** existe um outro helper,
`backend/src/helpers/CheckContactSomeTicket.ts`, com verificação ainda mais
permissiva (nem filtra por `status`) — confirmado, por busca no código, que
**não é importado em lugar nenhum** do backend; é código morto, não faz
parte deste fluxo.

### Correção aplicada
Arquivo: `backend/src/helpers/CheckContactOpenTickets.ts`.

```ts
where: {
  contactId,
  whatsappId,
  status: { [Op.or]: ["open", "pending", "chatbot"] }
}
```

`whatsappId` voltou ao `where` (parâmetro que já era recebido e já vinha
correto do chamador, sem precisar tocar em `CreateTicketService.ts`,
`TicketController.ts` ou no frontend) e o comentário obsoleto foi removido.
Bloqueio agora só ocorre quando existe ticket aberto/pendente/chatbot do
mesmo contato **na mesma conexão**; conexões diferentes deixam de colidir.

Nenhuma outra lógica do arquivo foi alterada (`include` de `queue`/`user`,
serialização via `.get({ plain: true })`, status code 409).

### Verificação
- `npx tsc --noEmit -p backend/tsconfig.json` — 35 erros, idêntico ao
  baseline do projeto; zero novos; nenhum em `CheckContactOpenTickets.ts`.
- Ainda não testado manualmente pelo usuário na interface real (criar
  ticket do contato Mendes em conexão diferente da que já está em
  atendimento).

---

## 10. Transferência manual de ticket não migra a conexão (whatsappId) para a do usuário destino

### Status: ✅ Corrigido

### Sintoma
Ticket #13383 na conexão "CHIP-MENDES" (whatsappId X), transferido
manualmente para o usuário "Mendes-HML" (conexão padrão "EMM TECNOLOGIA",
whatsappId Y, fila "HML"). Depois da transferência, o ticket permanecia na
conexão "CHIP-MENDES" em vez de migrar para a conexão padrão do usuário
destino — as próximas mensagens do atendente continuavam saindo pelo chip
errado.

### Investigação
Fluxo mapeado: `TransferTicketModalCustom` (frontend) → `PUT
/tickets/:ticketId` `{ userId, queueId, isTransfered: true }` →
`TicketController.update` → `UpdateTicketService.ts`.

O único `ticket.update(...)` que persiste a transferência (fim da função)
não incluía `whatsappId` na lista de campos:
```ts
await ticket.update({
  status, queueId, userId, isBot, queueOptionId,
  amountUsedBotQueues, lastMessage, useIntegration, integrationId,
  typebotSessionId, typebotStatus, unreadMessages, valorVenda,
  motivoNaoVenda, motivoFinalizacao, finalizadoComVenda
});
```
Pior: a interface `TicketData` (contrato do `req.body` desse endpoint) nem
tinha um campo `whatsappId` — o backend não aceitaria esse valor mesmo que o
frontend enviasse. `GetTicketWbot.ts` (usado para toda mensagem enviada
dentro do ticket) resolve a conexão só por `ticket.whatsappId`, então o
campo nunca mudar após a transferência fazia o atendente continuar preso à
conexão antiga.

A conexão padrão do usuário já existe como dado (`Users.whatsappId`,
`backend/src/models/User.ts:69`) e já tem um helper pronto,
`backend/src/helpers/GetDefaultWhatsAppByUser.ts` (usado em
`CreateTicketService.ts` para criação manual de ticket) — só não estava
conectado ao fluxo de transferência (`UpdateTicketService.ts`).

### Correção aplicada
Arquivo: `backend/src/services/TicketServices/UpdateTicketService.ts`.

1. Import de `GetDefaultWhatsAppByUser`.
2. Nova variável `transferWhatsappId: number | undefined`, declarada antes
   do bloco `if (isTransfered) { ... }`.
3. Dentro do branch de transferência que **mantém o mesmo ticket** (`else`
   de `settings.closeTicketOnTransfer`, já dentro de `if (isTransfered)`),
   logo antes das notificações de transferência que já checavam `oldUserId
   !== userId`:
   ```ts
   if (isTransfered && oldUserId !== userId && !isNil(userId)) {
     const defaultWhatsapp = await GetDefaultWhatsAppByUser(userId);
     if (defaultWhatsapp) {
       transferWhatsappId = defaultWhatsapp.id;
     }
   }
   ```
4. No `ticket.update(...)` final, a chave `whatsappId` só é incluída via
   spread condicional quando `transferWhatsappId` foi resolvido:
   ```ts
   ...(transferWhatsappId ? { whatsappId: transferWhatsappId } : {})
   ```

Efeito: quando **não** é transferência manual (`isTransfered` ausente/false
— updates automáticos de bot/roteador) ou quando o `userId` não muda (só
troca de fila), `transferWhatsappId` nunca é setado, o spread fica vazio e o
`whatsappId` do ticket **não é tocado** — comportamento idêntico ao anterior
à correção. Se o usuário destino não tiver conexão padrão cadastrada
(`user.whatsapp` nulo), `transferWhatsappId` também fica `undefined` —
fallback silencioso, ticket mantém a conexão atual, sem erro.

**Não coberto por esta correção** (na época): o caminho
`settings.closeTicketOnTransfer === true` (fecha o ticket antigo e cria um
novo via `FindOrCreateTicketService`) — esse branch faz `return` antes de
chegar no `ticket.update` corrigido acima, e continuava passando
`ticket.whatsapp` (a conexão antiga) explicitamente para o ticket novo.
Ficou de fora do pedido original (só o branch onde o ticket "permanece", que
era o cenário relatado nesta rodada) — **corrigido na subseção 10.1
abaixo**, quando ficou confirmado que o cenário real da empresa usa
`closeTicketOnTransfer` habilitado.

### Verificação
- `npx tsc --noEmit -p backend/tsconfig.json` — 35 erros, idêntico ao
  baseline do projeto; zero novos; nenhum em `UpdateTicketService.ts`.
- Nenhuma outra lógica do arquivo alterada: randomização de fila, mensagens
  de aviso de transferência, `CreateLogTicketService`, `ticketTraking`,
  emissão de socket — todos intactos.
- Ainda não testado manualmente pelo usuário na interface real (transferir
  o ticket #13383 para "Mendes-HML" e confirmar que o `whatsappId` do
  ticket passa a ser o da conexão "EMM TECNOLOGIA").

---

### 10.1 `closeTicketOnTransfer === true` — ticket novo herdava a conexão antiga

#### Status: ✅ Corrigido

#### Sintoma
A correção principal da seção 10 só funcionava quando a empresa tem
`settings.closeTicketOnTransfer` **desabilitado** (ticket permanece o
mesmo). O cenário real reportado usa `closeTicketOnTransfer === true`: ao
transferir, o ticket antigo é **fechado** e um ticket **novo** é criado via
`FindOrCreateTicketService` — esse ticket novo herdava a conexão antiga, não
a conexão padrão do usuário destino.

#### Investigação
Dentro de `if (isTransfered) { if (settings.closeTicketOnTransfer) { ... } }`
(`UpdateTicketService.ts`), quando `oldQueueId !== queueId`:
```ts
newTicketTransfer = await FindOrCreateTicketService(
  ticket.contact,
  ticket.whatsapp,   // ← sempre a conexão do ticket ANTIGO
  1,
  ticket.companyId,
  queueId,
  userId,
  null,
  ticket.channel,
  false,
  false,
  settings,
  isTransfered
);

await FindOrCreateATicketTrakingService({
  ticketId: newTicketTransfer.id,
  companyId,
  whatsappId: ticket.whatsapp.id,   // ← mesmo valor antigo, repetido aqui
  userId
});
```
`FindOrCreateTicketService` recebe a conexão como **instância** `Whatsapp`
(2º parâmetro posicional, não um id solto) e usa `whatsapp.id` para criar o
`Ticket.create({..., whatsappId: whatsapp.id, ...})` — como sempre recebia
`ticket.whatsapp` (a conexão de origem), o ticket recém-criado nascia
sempre na mesma conexão do ticket fechado, independente de qual usuário
recebeu a transferência.

#### Correção aplicada
Mesmo arquivo, mesma lógica da correção principal desta seção — antes da
chamada a `FindOrCreateTicketService`:
```ts
let closeTransferWhatsapp = ticket.whatsapp;
if (isTransfered && oldUserId !== userId && !isNil(userId)) {
  const defaultWhatsapp = await GetDefaultWhatsAppByUser(userId);
  if (defaultWhatsapp) {
    closeTransferWhatsapp = defaultWhatsapp;
  }
}

newTicketTransfer = await FindOrCreateTicketService(
  ticket.contact,
  closeTransferWhatsapp,   // era ticket.whatsapp
  ...
);

await FindOrCreateATicketTrakingService({
  ticketId: newTicketTransfer.id,
  companyId,
  whatsappId: closeTransferWhatsapp.id,   // era ticket.whatsapp.id
  userId
});
```
`closeTransferWhatsapp` começa como `ticket.whatsapp` (conexão atual — o
mesmo valor de antes) e só é trocado quando a transferência é manual
(`isTransfered`), muda de usuário (`oldUserId !== userId`) e o novo usuário
tem conexão padrão cadastrada (`GetDefaultWhatsAppByUser` não retorna
`null`) — fallback silencioso idêntico ao da correção principal: sem
conexão padrão, `closeTransferWhatsapp` continua sendo `ticket.whatsapp`,
mesmo comportamento de antes.

**Ajuste adicional necessário para consistência (não pedido explicitamente,
mas decorrente direto da mudança):** a chamada logo abaixo,
`FindOrCreateATicketTrakingService({ whatsappId: ... })`, usava a mesma
variável `ticket.whatsapp.id` — se não fosse trocada para
`closeTransferWhatsapp.id` junto, o registro de tracking do ticket novo
ficaria com um `whatsappId` diferente do `Ticket.whatsappId` real recém-
criado (que passa a ser `closeTransferWhatsapp.id` via
`FindOrCreateTicketService`/`Ticket.create`), reintroduzindo uma
inconsistência equivalente à que estava sendo corrigida.

Nenhuma outra parte do branch `closeTicketOnTransfer` foi alterada: fechamento
do ticket antigo, emissão de socket, criação da mensagem de transferência
(`msgTransfer`), notificações (`sendMsgTransfTicket`), `CreateLogTicketService`.

#### Verificação
- `npx tsc --noEmit -p backend/tsconfig.json` — 35 erros, idêntico ao
  baseline do projeto; zero novos; nenhum em `UpdateTicketService.ts`.
- Backup do arquivo (`.bak`) atualizado para refletir o estado imediatamente
  anterior a esta subseção (após a correção principal da seção 10, antes
  desta).
- Ainda não testado manualmente pelo usuário na interface real — cenário
  real da empresa usa `closeTicketOnTransfer` habilitado, é este o caminho
  que precisa ser validado (transferir ticket com troca de fila para um
  usuário com conexão padrão diferente da conexão atual do ticket).
