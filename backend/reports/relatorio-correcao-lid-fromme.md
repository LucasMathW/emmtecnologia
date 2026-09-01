# Relatório: Correção da Resolução de Identificador de Contato para Mensagens fromMe com LID

**Data:** 2026-08-31  
**Commit:** `84a379c`  
**Arquivo modificado:** `backend/src/services/WbotServices/wbotMessageListener.ts`  
**Branch:** `fix/lendidão-na-aplicação`

---

## Resumo

Correção crítica na resolução de identificadores de contato para mensagens enviadas pelo próprio bot (flags `fromMe=true`) quando o `remoteJid` está em formato LID (Layer ID). O problema afetava especialmente o recebimento de ACKs de figurinhas GIF animadas, onde o identificador incorreto causava falhas no processamento e associação de mensagens aos contatos errados.

---

## Problemas Identificados

### 1. Identificador Incorreto para Mensagens fromMe com LID

**Cenário:** Quando o bot envia uma mensagem (ex: figurinha GIF animada) e recebe o_ACK_ de entrega, a mensagem vem com `fromMe=true` e `remoteJid` no formato `@lid`. O campo `participant_pn` (número de telefone do participante) pode conter um valor incorreto ou estar vazio, resultando em associação ao contato errado ou falha total.

**Antes:** A lógica usava `participant_pn` diretamente quando disponível, sem validar se o remetente era o próprio bot.

### 2. Falta de Contexto para Lookup de Contatos

A função `getContactMessage` não recebia o `companyId`, impossibilitando a busca de contatos no banco de dados para resolver o LID ao número real.

---

## Melhorias Implementadas

### 1. Adição do Parâmetro `companyId`

- **Local:** `getContactMessage` (linha 482)
- **Alteração:** Nova assinatura da função: `getContactMessage(msg: WAMessageSafe, wbot: Session, companyId?: number)`
- **Motivo:** Permite a busca de contatos na base de dados filtrando pela empresa correta.

### 2. Resolução de LID via Banco de Dados para Mensagens fromMe

- **Local:** linhas 506-530
- **Nova lógica:** Quando `key.fromMe === true` e o `remoteJid` contém `@lid`:
  1. Busca o contato pelo LID na tabela `Contact` filtrando por `companyId`.
  2. Se encontrado e possuir `number`, resolve o `remoteJid` para `${number}@s.whatsapp.net`.
  3. Se não encontrado, mantém o LID como identificador com log informativo.

### 3. Logging Informativo

- **Local:** linhas 517-528
- **Melhoria:** Mensagens de log claras indicando:
  - Quando um contato foi encontrado via LID: `[LID-FROMME] Contato encontrado pelo LID {lid} → usando número {number}`
  - Quando o contato não foi encontrado: `[LID-FROMME] Contato não encontrado pelo LID {lid} → mantendo LID como identificador`

---

## Impacto

| Área | Impacto |
|------|---------|
| Figurinhas GIF animadas | Correção de identificador incorreto em ACKs (de/para) |
| Mensagens enviadas pelo bot | Resolução correta do destinatário via LID → número real |
| Logs de depuração | Visibilidade melhorada sobre resolução de identificadores |
| Performance | Mínimo impacto (apenas consultas quando necessário) |

---

## Testes Recomendados

1. Enviar figurinha GIF animada e verificar se o ACK é processado com o contato correto
2. Verificar logs no console mostram mensagens `[LID-FROMME]` apropriadas
3. Confirmar que contatos sem registro no banco mantêm o LID como fallback

---

## Considerações Técnicas

- A busca no banco usa `Contact.findOne({ where: { lid, companyId } })` — requer que o contato já esteja previamente associado com seu LID no sistema.
- O LID é obtido de `key.sender_lid`, `key.participant_lid`, ou `key.remoteJid` dependendo da estrutura da mensagem.
- A função `normalizeJid` é usada para normalização padrão do WhatsApp.
