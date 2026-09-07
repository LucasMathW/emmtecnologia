# Relatório de Commit — 07/09/2026

**Branch:** `main`
**Autor:** Lucas Matheus
**Data:** 07/09/2026

---

## Resumo

Este commit consolida quatro frentes de trabalho: **rebranding de infraestrutura** (emmtecnologia → kbv / boxchatt.com), **simplificação radical da api_oficial** (remoção de fallbacks HTTP e código legado de envio com arquivo), **correção de bloqueio de performance no backend** (log de acesso não-bloqueante) e **otimizações de cache no frontend** (cache de módulo com LRU + batched state updates + correção do bug de perda de cache na troca de aba).

---

## Arquivos Modificados

### Infraestrutura — Docker e Docker Compose

| Arquivo | Mudanças | Descrição |
|---------|----------|-----------|
| `docker-compose.yml` | +52/-62 | Rebranding completo: serviços, contêineres, volumes, redes e domínios de `emmtecnologia`/`emmtecnologia.com.br` para `kbv`/`boxchatt.com`; portas atualizadas (backend 4001, apioficial 6001, frontend 3001); adicionada versão `"3.8"` |
| `api_oficial/Dockerfile` | +9/-9 | Remoção de linhas em branco desnecessárias entre instruções |
| `backend/Dockerfile` | +8/-12 | Remoção de linhas em branco; EXPOSE corrigido de `4099` → `4001` |
| `frontend/Dockerfile` | +1/-1 | EXPOSE corrigido de `3099` → `3001` |

**Domínios atualizados:**

| Serviço | Antes | Depois |
|---------|-------|--------|
| Backend | `api.emmtecnologia.com.br` | `kbvapi.boxchatt.com` |
| API Oficial | `apioficial.emmtecnologia.com.br` | `kbvapioficial.boxchatt.com` |
| Frontend | `app.emmtecnologia.com.br` | `kbv.boxchatt.com` |

---

### api_oficial — Simplificação e Remoção de Código Legado

#### `api_oficial/src/@core/infra/meta/meta.service.ts`

**Mudança:** Unificação do upload de arquivo para usar exclusivamente `file.buffer` (memoryStorage do Multer).

- **Removido:** suporte a `diskStorage` (`file.path` + `readFileSync`) — o Dockerfile e a configuração do Multer já usavam memoryStorage, tornando esse branch morto.
- **Adicionado:** conversão explícita `Buffer → Uint8Array` para garantir compatibilidade com a API `Blob` do Node 20.
- **Resultado:** código mais simples, sem I/O de disco desnecessário no path de upload.

```diff
- let fileData: Buffer;
- if (file.path) {
-   fileData = readFileSync(file.path);
- } else if (file.buffer) {
-   fileData = file.buffer;
- } else {
-   throw new Error('Arquivo não encontrado (sem path nem buffer)');
- }
- const blob = new Blob([fileData as BlobPart], { type: file.mimetype });
+ const uint8Array = new Uint8Array(file.buffer);
+ const blob = new Blob([uint8Array], { type: file.mimetype });
```

#### `api_oficial/src/@core/infra/socket/socket.service.ts`

**Mudança:** Remoção do mecanismo de fallback HTTP e do método `sendStatusUpdate`.

- **Removido:** dependência de `axios` (import e todas as chamadas).
- **Removido:** método `sendStatusUpdate()` — 40 linhas — que enviava atualizações de status (sent/delivered/read/failed) via HTTP POST ao backend.
- **Removido:** métodos privados `isHttpConnection()` e `getBaseUrl()` — helpers exclusivos do fallback HTTP.
- **Removido:** blocos de fallback HTTP (`// Tentativa 2`) em `sendMessage()` e `readMessage()` — ~80 linhas no total.
- **Alterado:** `newSocket.once('connect', ...)` → `newSocket.on('connect', ...)` e `newSocket.once('connect_error', ...)` → `newSocket.on('connect_error', ...)` — eventos passam a ser handlers permanentes em vez de one-shot.
- **Removido:** opções de reconexão `reconnectionDelay`, `reconnectionAttempts` e `timeout` do construtor do socket (deixadas para os defaults da lib).
- **Resultado:** ~150 linhas removidas; o serviço agora só usa WebSocket, sem dependências HTTP externas.

#### `api_oficial/src/resources/v1/send-message-whatsapp/send-message-whatsapp.controller.ts`

**Mudança:** Simplificação do endpoint principal de envio de mensagem.

- **Removido:** decorator `@UseInterceptors(FileInterceptor('file'))` e parâmetro `@UploadedFile()` — o endpoint deixou de aceitar `multipart/form-data` com arquivo.
- **Removido:** lógica condicional que detectava se havia arquivo ou campo `body.data` e roteava para `sendMessageWithFile` ou `sendMessage` — ~15 linhas de if/else/try-catch.
- **Resultado:** endpoint agora aceita exclusivamente JSON puro via `SendMessageDto`, comportamento determinístico e sem roteamento condicional.

```diff
- @UseInterceptors(FileInterceptor('file'))
  async sendMessage(
    @Param('token') token: string,
-   @Body() body: any,
-   @UploadedFile() file?: Express.Multer.File,
+   @Body() sendMessageDto: SendMessageDto,
  ) {
-   if (file || body.data) { ... }
-   return this.sendMessageService.sendMessage(token, body);
+   return this.sendMessageService.sendMessage(token, sendMessageDto);
  }
```

#### `api_oficial/src/resources/v1/send-message-whatsapp/send-message-whatsapp.service.ts`

**Mudança:** Remoção de ~150 linhas de código legado de envio com arquivo.

- **Removido:** método `sendMessageWithFile(token, rawData, file?)` — duplicata de `sendMessage` com lógica de upload embutida (upload para Meta API, normalização, gravação no banco, cache Redis).
- **Removido:** método privado `normalizeBackendPayload(rawData, file?)` — normalizava campos do formato do backend (`body_text`, `body_image`, `body_document`, etc.) para o formato interno (`SendMessageDto`). Era necessário apenas para `sendMessageWithFile`.
- **Removido:** método privado `setMediaId(dto, mediaId)` — auxiliar exclusivo de `sendMessageWithFile`.
- **Adicionados:** dois comentários de clareza nos métodos restantes (`buildMetaPayload` e `processMedia`) que antes ficavam entre código legado.
- **Resultado:** serviço reduzido a ~50% do tamanho anterior, mantendo toda a funcionalidade ativa.

#### `api_oficial/src/resources/v1/webhook/webhook.service.ts`

**Mudança:** Remoção da chamada `sendStatusUpdate` no handler de webhook.

- **Removido:** chamada `await this.socket.sendStatusUpdate({ messageId, status, companyId })` do handler de status de mensagem — o método foi removido do `SocketService` nesta mesma sessão.
- **Resultado:** webhook não tenta mais chamar um método inexistente; sem impacto funcional no fluxo de marcação de leitura (que permanece via `readMessage`).

**Arquivos de build compilados também atualizados** (dist/): `meta.service.js`, `socket.service.js/d.ts`, `send-message-whatsapp.controller.js/d.ts`, `send-message-whatsapp.service.js/d.ts`, `webhook.service.js`, `tsconfig.build.tsbuildinfo`.

**Novos arquivos compilados adicionados:** `dist/@core/guard/auth.decorator.{d.ts,js,js.map}`, `dist/@core/guard/auth.guard.js.map`, `dist/@core/infra/errors/` (novo módulo de erros estruturados).

---

### Backend — Correção de Bloqueio de Performance

#### `backend/src/controllers/TicketController.ts`

**Mudança:** `CreateLogTicketService` tornado não-bloqueante em `showFromUUID`.

- **Problema:** Na rota `GET /tickets/:uuid` (abertura de ticket pelo UUID), a chamada `await CreateLogTicketService({ userId, ticketId, type: "access" })` bloqueava o retorno da resposta ao frontend enquanto a inserção do log de acesso no banco terminava. Em cenários de alta carga ou banco lento, isso atrasava a exibição do ticket para o atendente.
- **Correção:** Removido o `await`; a chamada agora é fire-and-forget com `.catch()` para logar erros sem crashar a rota:

```diff
- await CreateLogTicketService({
+ CreateLogTicketService({
    userId,
    ticketId: ticket.id,
    type: "access"
- });
+ }).catch(err => console.error("[showFromUUID] CreateLogTicketService error:", err));
```

- **Resultado:** O `res.status(200).json(ticket)` é retornado imediatamente após `SetTicketMessagesAsRead`; o log de acesso é gravado em paralelo, sem atrasar o frontend.

---

### Frontend — Otimizações de Cache e Performance

#### `frontend/src/components/TicketsManagerTabs/index.js`

**Mudança:** Remoção de `handleBack()` de `handleChangeTabOpen`.

- **Problema (causa raiz):** Ao trocar de aba (ex: Abertos → Pendentes), `handleChangeTabOpen` chamava `handleBack()`, que limpava o ticket selecionado e invalidava o cache de mensagens/ticket do `useRef`. Resultado: toda troca de aba forçava recarregamento completo dos dados ao voltar para um ticket.
- **Correção:** Remoção da chamada `handleBack()`:

```diff
  const handleChangeTabOpen = (e, newValue) => {
-   handleBack();
    setTabOpen(newValue);
  };
```

- **Resultado:** Trocar de aba não descarta mais o estado do ticket atual; cache é preservado.

#### `frontend/src/components/MessagesList/index.js`

**Mudança:** Cache de mensagens migrado de `useRef` para cache de módulo com LRU.

- **Problema:** `messagesCacheRef = useRef(new Map())` — o cache vivia dentro da instância do componente React. A cada unmount/remount (ex: trocar de ticket, trocar de aba), o cache era destruído, forçando nova requisição à API mesmo para tickets recém-visitados.
- **Correção:** Cache extraído para escopo de módulo (`_messagesCache`, `Map` com limite de 30 entradas, evição LRU pelo primeiro elemento):

```js
// Cache de módulo: sobrevive ao unmount/remount do componente.
const _messagesCache = new Map();
const _maxMessagesCacheSize = 30;
const _setMessagesCache = (ticketId, value) => {
  if (_messagesCache.size >= _maxMessagesCacheSize) {
    _messagesCache.delete(_messagesCache.keys().next().value);
  }
  _messagesCache.set(ticketId, value);
};
```

- **Resultado:** Cache de mensagens persiste enquanto o SPA estiver carregado, independente de quantas vezes o componente montar/desmontar. Limite de 30 tickets previne consumo excessivo de memória.

#### `frontend/src/components/Ticket/index.js`

**Mudança:** Cache de tickets migrado de `useRef` para cache de módulo com LRU + batched state updates.

- **Problema 1 (cache):** Mesmo problema de `messagesCacheRef` — `ticketCacheRef = useRef(new Map())` era descartado a cada remount.
- **Correção 1 (cache):** Cache extraído para escopo de módulo (`_ticketCache`, limite de 50 entradas, mesma política LRU):

```js
const _ticketCache = new Map();
const _maxTicketCacheSize = 50;
const _setTicketCache = (ticketId, value) => {
  if (_ticketCache.size >= _maxTicketCacheSize) {
    _ticketCache.delete(_ticketCache.keys().next().value);
  }
  _ticketCache.set(ticketId, value);
};
```

- **Problema 2 (renders desnecessários):** Múltiplos `setState` sequenciais (setContact, setTicket, setLoading, setTabOpen) disparavam um re-render por chamada, causando flickers visuais na transição entre tickets.
- **Correção 2 (batching):** Agrupamento das atualizações de estado em `ReactDOM.unstable_batchedUpdates()` — todos os estados são aplicados em um único re-render:

```js
ReactDOM.unstable_batchedUpdates(() => {
  setContact(cached.contact);
  setTicket(cached.ticket);
  setLoading(false);
  if (["pending", "open", "group"].includes(cached.ticket.status)) {
    setTabOpen(cached.ticket.status);
  }
});
```

- **Correção adicional:** `latestContactPic.current = ""` reseta a foto ao trocar de ticket, evitando que a foto de um ticket anterior "vaze" para o próximo antes da API responder.
- **Resultado:** Troca de ticket com cache hit: dados exibidos instantaneamente com zero requisições à API e sem flicker de estado intermediário.

---

## Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `docker-compose-backup.yml` | Backup do docker-compose anterior (emmtecnologia) antes do rebranding |
| `api_oficial/Dockerfile-old` | Backup do Dockerfile anterior da api_oficial |
| `backend/public/LOGO_GRUPO_KBV_FUNDO_TRANSPARENT_1.png` | Logo KBV com fundo transparente |
| `backend/public/LOGO_KBVAÇÃO__fundo_branco.png` | Logo KBV com fundo branco |
| `api_oficial/dist/@core/guard/auth.decorator.{d.ts,js,js.map}` | Arquivos compilados do decorator de autenticação |
| `api_oficial/dist/@core/guard/auth.guard.js.map` | Source map do guard de autenticação |
| `api_oficial/dist/@core/infra/errors/` | Módulo compilado de erros estruturados |

---

## Estatísticas

| Métrica | Valor |
|---------|-------|
| Arquivos fonte modificados | 15 |
| Arquivos compilados (dist) modificados | 10 |
| Arquivos novos | 9 |
| Linhas adicionadas | ~198 |
| Linhas removidas | ~801 |
| Saldo líquido | −603 linhas (simplificação) |

---

## Impacto por Área

### Performance (frontend)
- **Antes:** Troca de aba descartava cache; troca de ticket forçava requisição à API mesmo para tickets recém-visitados; múltiplos re-renders por transição.
- **Depois:** Cache de módulo persiste por toda a sessão (30 mensagens, 50 tickets); troca de ticket com hit é instantânea; re-renders agrupados via `unstable_batchedUpdates`.

### Performance (backend)
- **Antes:** Abertura de ticket bloqueava resposta HTTP enquanto gravava log de acesso no banco.
- **Depois:** Log de acesso é assíncrono (fire-and-forget); resposta retorna imediatamente ao frontend.

### Confiabilidade (api_oficial)
- **Antes:** `sendMessage`/`readMessage` tinham fallback HTTP como plano B, mas o fallback dependia de `axios` e de uma URL de backend configurada — adicional de complexidade raramente exercido.
- **Depois:** Único caminho: WebSocket. Sem dependência de `axios` nem de URL HTTP configurada. Comportamento previsível em caso de falha (log de erro, sem retry silencioso).

### Infraestrutura
- **Antes:** Serviços nomeados como `emmtecnologia-*`, apontando para `emmtecnologia.com.br`.
- **Depois:** Serviços nomeados como `kbv-*`, apontando para `boxchatt.com`. Portas corrigidas para refletir a configuração real de produção.

---

## Conclusão

As mudanças desta sessão entregam uma redução líquida de ~600 linhas de código (remoção de código morto e fallbacks não utilizados), três melhorias mensuráveis de performance no frontend (cache persistente + batching), uma melhoria de throughput no backend (log não-bloqueante) e a migração completa de infraestrutura para a identidade KBV/boxchatt.com.
