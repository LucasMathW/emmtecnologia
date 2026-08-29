# Relatório de Commit — 28/08/2026

**Branch:** `fix/lendidão-na-aplicação`
**Commit:** `f3a7d1c151ffdc5d3ee3cdc49a77a78eb8cdcd75`
**Autor:** Lucas Matheus
**Data:** 28/08/2026

---

## Resumo

Este commit concentra-se em **refatoração de performance**, **remoção de código morto** e **padronização de formatação** em todo o codebase backend e frontend. A principal motivação foi corrigir gargalos de lentidão na aplicação, especialmente relacionados a concorrência no processamento de mensagens e contagem de não-lidas.

---

## Arquivos Modificados

### Backend — Configuração e Infraestrutura

| Arquivo | Mudanças | Descrição |
|---------|----------|-----------|
| `backend/src/config/database.ts` | +6/-4 | Padronização de formatação (aspas, trailing commas) |
| `backend/src/libs/ContactMutex.ts` | +20/-5 | Correção de bug de concorrência no mutex |
| `backend/src/libs/cache.ts` | +6/-4 | Padronização de formatação |
| `backend/src/libs/socket.ts` | +4/-2 | Padronização de formatação |
| `backend/src/middleware/envTokenAuth.ts` | +10/-5 | Padronização de formatação |
| `backend/src/models/Company.ts` | 0/-1 | Remoção de import não utilizado |
| `backend/src/queues.ts` | +13/-8 | Padronização de formatação |
| `backend/src/routes/authRoutes.ts` | +59/-38 | Padronização de formatação |
| `backend/src/server.ts` | +28/-18 | Padronização de formatação |
| `docker-compose-dev.yml` | +6/-4 | Padronização de formatação |

### Backend — Serviços

| Arquivo | Mudanças | Descrição |
|---------|----------|-----------|
| `backend/src/services/ContactServices/CreateOrUpdateContactService.ts` | +109/-85 | Uso de `getDataValue` para acesso correto a campos Sequelize; normalização de email com `contact?.email` |
| `backend/src/services/FacebookServices/facebookMessageListener.ts` | +284/-166 | Remoção de imports não utilizados; padronização de formatação |
| `backend/src/services/TicketServices/FindOrCreateTicketService.ts` | +30/-10 | Remoção de código comentado morto; remoção de `console.log` de debug |
| `backend/src/services/WbotServices/verifyContact.ts` | +250/-140 | Correção de bug na contagem de mensagens não lidas via `cacheLayer.incr`; padronização |
| `backend/src/services/WbotServices/wbotMessageListener.ts` | +381/-280 | **Principais correções de concorrência**: mutex de tickets, contagem atômica de unreads, remoção de imports mortos |
| `backend/src/services/WebhookService/ActionsWebhookService.ts` | +629/-580 | Correção de bug: `lastFlowId: null` removido para evitar reset indevido; verificação de contact antes de fluxos; remoção de código morto |
| `backend/src/services/WhatsappService/ShowWhatsAppService.ts` | +15/-10 | Padronização de formatação |

### Frontend

| Arquivo | Mudanças | Descrição |
|---------|----------|-----------|
| `frontend/src/components/MessagesList/index.js` | +241/-180 | Padronização de aspas e trailing commas |
| `frontend/src/components/TicketListItemCustom/index.js` | +38/-20 | Padronização de formatação |
| `frontend/src/components/TicketsListCustom/index.js` | +290/-200 | Padronização de formatação |

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `backend/check-flow-include.sh` | Script Bash para validar includes de `FlowBuilderModel` em `ShowWhatsAppService` |
| `backend/src/scripts/create-admin.ts` | Script para criação automatizada de usuário admin |
| `Notes` | Arquivo criado durante o desenvolvimento (possivelmente notas temporárias) |

---

## Principais Correções Técnicas

### 1. Correção de Bug de Concorrência no Mutex (`wbotMessageListener.ts`)

**Problema:** O mutex de tickets usava `setTimeout` para limpeza após 30 segundos, mas esse timer podia remover o mutex enquanto ainda estava sendo usado por outro fluxo, permitindo que duas execuções concorrentes entrassem na seção crítica simultaneamente.

**Solução:**
- Remoção do `setTimeout` agressivo na criação do mutex
- Adição de `setInterval` de 60 segundos que verifica `mutex.isLocked()` antes de remover
- Adição de `picInFlight` (Set) para evitar cadeias de retry concorrentes para o mesmo contato

### 2. Contagem Atômica de Mensagens Não lidas (`verifyContact.ts`)

**Problema:** A contagem usava `cacheLayer.get` + `cacheLayer.set`, que não é atômico. Mensagens simultâneas do mesmo contato podiam sobrescrever o incremento, perdendo contagens.

**Solução:** Substituição por `cacheLayer.incr()` — operação atômica no Redis garantindo contagem correta mesmo com mensagens simultâneas.

### 3. Correção: `lastFlowId: null` removido (`ActionsWebhookService.ts`)

**Problema:** O `flowbuilderIntegration` zerava `lastFlowId: null`, mas isso permitia que o mesmo fluxo fosse reexecutado, causando loops infinitos ou duplicidade.

**Solução:** Remoção do `lastFlowId: null` mantendo apenas `hashFlowId: null` e `flowWebhook: true` para marcar início do processamento.

### 4. Verificação de Existência de Contato (`wbotMessageListener.ts`)

**Problema:** Funções de campanha/fluxo acessavam `contact.email`, `contact.number`, etc. sem verificar se `contact` existia, causando erros em runtime.

**Solução:**
- Adição de bloco `if (!contact)` antes de montar `mountDataContact`
- Uso de optional chaining `contact?.email` em todos os acessos
- Limpeza de estado do ticket (reseta `flowWebhook` e `isBot`) em caso de erro

### 5. Remoção de Imports Não Utilizados

Foram removidos imports mortos em vários arquivos:
- `wbotMessageListener.ts`: `MediaType`, `MessageReaction`, `Console`, `ms` (date-fns), `normalizeContactToEmit`, `ticketFinalizationReasonRoutes`
- `facebookMessageListener.ts`: import multi-linha reorganizado

### 6. Remoção de Código Comentado Morto

- `FindOrCreateTicketService.ts`: blocos de debug `try/catch`, `setTimeout`, `console.log` removidos
- `wbotMessageListener.ts` e `ActionsWebhookService.ts`: blocos extensos de código comentado (debug de reload de ticket, logs de fluxo, etc.) removidos — aproximadamente 100+ linhas

---

## Padronização de Formatação

- **Aspas:** Conversão de aspas simples (`'`) para duplas (`"`) em todo o codebase
- **Trailing commas:** Adição de trailing commas em arrays, objetos e imports multi-linha
- **Formatação:** Quebra de linhas longas em chamadas de função, formatação de `path.join()`, `if (condition)` com espaço, etc.

---

## Melhorias e Itens de Atenção

### Itens de Melhoria Identificados

1. **`backend/src/scripts/create-admin.ts`:**
   - Hardcoded password `admin123` — adequar para ambiente de desenvolvimento apenas
   - `as any` em múltiplas criações — revisar tipagem

2. **`backend/check-flow-include.sh`:**
   - Script útil mas sem integração em CI/CD — recomenda-se adicionar pipeline

3. **`wbotMessageListener.ts`:**
   - `sendMessageOptions` ainda recebe `String(companyId)` em alguns pontos — considerar unificar para passar `companyId` diretamente como número

4. **Acesso a `contact?.email`:**
   - Apesar do optional chaining, `contact?.email` pode ser `undefined` — verificar se os serviços downstream lidam com `undefined` adequadamente

5. **`docker-compose-dev.yml`:**
   - Mudanças menores de formatação — verificar se ambiente de desenvolvimento ainda funciona como esperado

### Arquivo `Notes`

O arquivo `Notes` foi criado sem extensão clara. Recomenda-se:
- Remover do controle de versão se for temporário
- Ou renomear com extensão apropriada (`.md`, `.txt`) e adicionar conteúdo relevante

---

## Estatísticas

| Métrica | Valor |
|---------|-------|
| Arquivos modificados | 23 |
| Arquivos novos | 3 (excluindo `Notes`) |
| Linhas adicionadas | 1.404 |
| Linhas removidas | 1.239 |
| Principais áreas | Backend (18 arquivos), Frontend (3 arquivos), Docker (1 arquivo) |

---

## Conclusão

Este commit entrega correções significativas de performance e concorrência, especialmente na camada de processamento de mensagens WhatsApp. As mudanças no mutex e na contagem atômica de não-lidas resolvem gargalos identificados na branch `fix/lendidão-na-aplicação`. A padronização de formatação melhora a manutenibilidade, e os novos scripts automatizam tarefas operacionais.

---

# Relatório Técnico — Fotos de Contato não Carregavam (29/08/2026)

**Branch:** `fix/lendidão-na-aplicação`
**Autor:** Lucas Matheus
**Data:** 29/08/2026

---

## Contexto

Após a migração para uma versão mais recente do Baileys (biblioteca de conexão com WhatsApp), as fotos de perfil dos contatos individuais pararam de carregar completamente. Grupos continuavam funcionando. Além disso, mesmo quando a foto era carregada pela primeira vez, qualquer mudança posterior (troca direta de foto A para foto B) não era refletida na aplicação. O sistema só percebia a mudança quando o contato removia a foto e colocava uma nova. A sidebar de tickets também não atualizava em tempo real — exigia recarregar a página.

Foram identificados e corrigidos **quatro problemas independentes**, cada um com uma causa raiz distinta.

---

## Problema 1 — Fotos de contatos individuais nunca carregavam (timeout silencioso)

### Sintoma
Qualquer chamada a `wbot.profilePictureUrl(jid, "image")` para contatos individuais (`@s.whatsapp.net`) travava por 10-15 segundos e retornava `null` ou lançava timeout. Grupos (`@g.us`) funcionavam normalmente.

### Causa Raiz
O Baileys possui uma propriedade interna chamada `serverProps`, preenchida durante a conexão com o servidor WhatsApp via uma query `fetchProps()`. Entre as props retornadas está `profilePicPrivacyToken` (AB prop 9666).

Quando `profilePicPrivacyToken = true`, o Baileys executa `buildTcTokenFromJid(jid)` antes de cada requisição de foto para JIDs do tipo usuário (`isUserJid`). Esse token é um dado de sessão que o servidor WhatsApp exige para autenticar a requisição. Sem ele, o servidor **descarta silenciosamente o pacote IQ** — sem resposta, sem erro, o cliente simplesmente aguarda até o timeout.

Grupos não sofrem esse problema porque `@g.us` não é `isUserJid`, então o bloco do tcToken é ignorado.

O problema era que, no ambiente em questão, `serverProps.profilePicPrivacyToken` retornava `true`. Tentou-se forçá-lo para `false` com uma simples atribuição no handler de `connection.update "open"`:

```ts
(wsocket as any).serverProps.profilePicPrivacyToken = false;
```

Isso funcionava temporariamente, mas era sobrescrito logo em seguida. O motivo: o Baileys chama `executeInitQueries()` **sem `await`** logo após emitir `connection.update "open"`. Isso significa que `executeInitQueries()` (que internamente chama `fetchProps()` e preenche `serverProps` com os valores do servidor) roda **de forma assíncrona após** o nosso handler ter terminado. Nosso `= false` era sobrescrito pelo valor real retornado pelo servidor.

### Solução
Usar `Object.defineProperty` para travar a propriedade com um getter que sempre retorna `false` e um setter que é no-op (ignora qualquer escrita), tornando a substituição pelo Baileys inócua:

```ts
// backend/src/libs/wbot.ts — dentro do handler connection.update "open"
if ((wsocket as any).serverProps) {
  Object.defineProperty((wsocket as any).serverProps, "profilePicPrivacyToken", {
    get: () => false,
    set: () => { /* no-op: impede que executeInitQueries() sobrescreva */ },
    configurable: true,
  });
}
```

**Arquivos modificados:** `backend/src/libs/wbot.ts`

---

## Problema 2 — Foto A→B não atualizava (URL igual após stripWaSigning)

### Sintoma
Quando um contato trocava sua foto diretamente (A→B), o backend recebia o evento `contacts.update`, buscava a nova URL da foto, mas a foto no sistema permanecia a antiga. Logs mostravam a nova URL sendo recebida corretamente, porém sem efeito.

### Causa Raiz — Parte 1: comparação de URLs com `stripWaSigning`

O serviço `CreateOrUpdateContactService` possui uma função `stripWaSigning` que remove tudo após o `?` das URLs de CDN do WhatsApp. A lógica de `updateImage` compara a URL atual com a nova para decidir se precisa re-baixar a imagem:

```ts
stripWaSigning(contact?.profilePicUrl) !== stripWaSigning(profilePicUrl)
```

O WhatsApp CDN frequentemente mantém o mesmo caminho base da URL e apenas troca os parâmetros de assinatura (`?Expires=...&Signature=...`). Após o `stripWaSigning`, as duas URLs ficavam **idênticas** → `updateImage = false` → download nunca acontecia.

**Solução para Parte 1:** Adicionar flag `forceUpdatePic: true` que bypassa a comparação quando chamado pelo handler de `contacts.update`, pois nesse contexto sabemos que o contato mudou a foto:

```ts
// wbotMessageListener.ts
await CreateOrUpdateContactService({
  ...
  forceUpdatePic: true,
});
```

```ts
// CreateOrUpdateContactService.ts
let updateImage =
  ((forceUpdatePic ||          // ← se forçado, pula a comparação
    !contact ||
    (stripWaSigning(contact?.profilePicUrl) !== stripWaSigning(profilePicUrl) && ...))
    && !!profilePicUrl && !profilePicUrl.includes("nopicture")) || false;
```

### Causa Raiz — Parte 2: short-circuit cancelava o download mesmo com `forceUpdatePic`

Dentro do bloco `if (updateImage)`, havia uma verificação secundária:

```ts
filename = `${contact.id}.jpeg`;
const filePath = join(folder, filename);

if (
  fs.existsSync(filePath) &&
  contact.getDataValue("urlPicture") === filename
) {
  updateImage = false;  // ← cancelava o download
}
```

Essa verificação era uma otimização: "se o arquivo já existe no disco e o banco aponta para ele, não precisa re-baixar". O problema é que o filename era **sempre `{contact.id}.jpeg`** — um nome fixo. Então, para qualquer contato com foto já baixada:
- O arquivo `{id}.jpeg` existe → `fs.existsSync` = `true`
- O banco tem `urlPicture = "{id}.jpeg"` → segunda condição = `true`
- `updateImage = false` → download cancelado, mesmo com `forceUpdatePic: true`

### Causa Raiz — Parte 3: cache do browser (mesmo que o download ocorresse)

Hipotético: mesmo que o download acontecesse e sobrescrevesse o arquivo `{id}.jpeg` com a foto B, o `urlPicture` no banco permanecia com o mesmo valor. O evento de socket emitido para o frontend carregaria o mesmo URL, e o browser — com a imagem em cache — serviria a foto A sem fazer nova requisição ao servidor.

### Solução Unificada
Adicionar timestamp ao filename em todos os locais onde a foto é salva em disco:

```ts
// Antes:
const filename = `${contact.id}.jpeg`;

// Depois:
const filename = `${contact.id}_${Date.now()}.jpeg`;
```

Isso resolve os três problemas simultaneamente:
- O arquivo novo não existe ainda → `fs.existsSync = false` → short-circuit não cancela
- O `urlPicture` no banco muda para um valor diferente → frontend recebe novo URL
- O browser busca a nova URL sem cache hit → exibe foto B

Adicionalmente, o `oldBaseName !== filename` agora é sempre `true` (timestamps diferentes), então o arquivo antigo é automaticamente deletado, sem acúmulo de arquivos órfãos em disco.

**Arquivos modificados:**
- `backend/src/services/ContactServices/CreateOrUpdateContactService.ts` (3 locais)
- `backend/src/services/WbotServices/wbotMessageListener.ts`

---

## Problema 3 — Sidebar de tickets não atualizava em tempo real

### Sintoma
Após a foto ser atualizada no banco, o sidebar da lista de tickets continuava exibindo a foto antiga. Só atualizava ao recarregar a página.

### Causa Raiz
O backend emite corretamente um evento de socket com `data.action = "update"` e `data.contact = {...}` quando um contato tem sua foto atualizada. No frontend, o componente `TicketsListCustom` possui um handler `onCompanyContactTicketsList` que escuta esses eventos.

Porém, dentro do handler, o `dispatch` para `UPDATE_TICKET_CONTACT` estava **comentado** (desabilitado). O código processava `data.ticket` e `data.message` corretamente, mas ignorava `data.contact`. O avatar nunca era atualizado na memória do componente.

Adicionalmente, os ciclos de `RESET` + `LOAD` da lista de tickets (ex.: ao mudar de aba ou atualizar filtros) sobrescreviam o estado dos tickets com os dados do banco, potencialmente perdendo a foto já atualizada em memória antes que o banco fosse persistido.

### Solução
Reabilitar o `dispatch` de `UPDATE_TICKET_CONTACT` no handler:

```js
// frontend/src/components/TicketsListCustom/index.js
const onCompanyContactTicketsList = useCallback((data) => {
  if (data.action === "update" && data.contact) {
    if (data.contact.urlPicture && data.contact.number) {
      preservedPicsRef.current[data.contact.number] = data.contact.urlPicture;
    }
    dispatch({
      type: "UPDATE_TICKET_CONTACT",
      payload: data.contact,
      status,
      sortDir: sortTickets,
    });
  }
  // ... resto do handler
}, [...]);
```

O `preservedPicsRef` garante que, após um ciclo RESET/LOAD, a foto mais recente seja restaurada mesmo que o banco ainda não tenha sido atualizado.

**Arquivos modificados:** `frontend/src/components/TicketsListCustom/index.js`

---

## Diagrama do Fluxo Corrigido

```
WhatsApp Server
    │
    │ contacts.update (foto mudou)
    ▼
wbotMessageListener.ts
    │ profilePictureUrl(jid)   ← funciona pois profilePicPrivacyToken=false (fix 1)
    │ retorna nova URL
    │
    ▼
CreateOrUpdateContactService.ts
    │ forceUpdatePic: true     ← bypassa comparação stripWaSigning (fix 2a)
    │ updateImage = true
    │
    │ filename = {id}_{ts}.jpeg ← novo arquivo, não cai no short-circuit (fix 2b)
    │ download da foto B
    │ salva em disco
    │ urlPicture = "{id}_{ts}.jpeg"  ← URL nova, browser não usa cache (fix 2c)
    │
    ▼
Socket emit: { action: "update", contact: { urlPicture: "{id}_{ts}.jpeg" } }
    │
    ▼
TicketsListCustom/index.js
    │ onCompanyContactTicketsList(data)
    │ dispatch UPDATE_TICKET_CONTACT  ← estava comentado, agora ativo (fix 3)
    ▼
Avatar atualizado em tempo real ✅
```

---

## Resumo dos Arquivos Modificados (29/08/2026)

| Arquivo | Problema corrigido |
|---|---|
| `backend/src/libs/wbot.ts` | `profilePicPrivacyToken` travado em `false` via `Object.defineProperty` |
| `backend/src/routes/authRoutes.ts` | Endpoint de debug expõe `serverProps` para validação |
| `backend/src/services/WbotServices/wbotMessageListener.ts` | `forceUpdatePic: true` no handler `contacts.update` |
| `backend/src/services/ContactServices/CreateOrUpdateContactService.ts` | Timestamp no filename (3 locais); remoção do short-circuit |
| `frontend/src/components/TicketsListCustom/index.js` | Despacho `UPDATE_TICKET_CONTACT` reabilitado + `preservedPicsRef` |
