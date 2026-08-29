#!/usr/bin/env bash
# Verifica se o include de FlowBuilderModel em ShowWhatsAppService é peso morto.
# Uso: ./check-flow-include.sh [diretorio_src]
# Ex:  ./check-flow-include.sh src

set -euo pipefail

SRC="${1:-src}"
if [ ! -d "$SRC" ]; then
  echo "❌ Diretório '$SRC' não encontrado."
  exit 1
fi

# ---------- util ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
section() { echo -e "\n${CYAN}▶ $1${NC}"; }

# detecta rg ou grep
if command -v rg >/dev/null 2>&1; then
  GREP_CMD=(rg -n --type ts --type js --type-add 'vue:*.vue' -t vue)
else
  GREP_CMD=(grep -rn --include="*.ts" --include="*.js" --include="*.vue")
fi

# ---------- 1. consumidores do ShowWhatsAppService ----------
section "1. Consumidores de ShowWhatsAppService"
mapfile -t CONSUMERS < <("${GREP_CMD[@]}" "ShowWhatsAppService" "$SRC" | cut -d: -f1 | sort -u)
echo "Encontrados ${#CONSUMERS[@]} arquivos:"
printf '  - %s\n' "${CONSUMERS[@]}"

# ---------- 2. acesso a flow/flows nesses consumidores ----------
section "2. Uso de 'flow'/'flows' nesses arquivos"
FLOW_HITS=()
for f in "${CONSUMERS[@]}"; do
  # ignora o próprio service (lá é onde o include vive)
  [[ "$f" == *ShowWhatsAppService* ]] && continue
  # busca: whatsapp.flow, whatsapp.flows, { flow }, { flows }, ['flow'], ['flows']
  hits=$(grep -nE "\bwhatsapp\.flows?\b|\bwhatsapp\[['\"]flows?['\"]\]|\{\s*[^}]*\bflows?\b[^}]*\}|['\"]flows?['\"]" "$f" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    FLOW_HITS+=("$f")
    echo -e "  ${YELLOW}⚠ $f${NC}"
    echo "$hits" | sed 's/^/      /'
  fi
done
[ ${#FLOW_HITS[@]} -eq 0 ] && echo -e "  ${GREEN}✓ Nenhum acesso a flow/flows encontrado.${NC}"

# ---------- 3. FlowBuilderModel fora do ShowWhatsAppService ----------
section "3. Uso de FlowBuilderModel fora do ShowWhatsAppService"
mapfile -t FBM_USES < <("${GREP_CMD[@]}" "FlowBuilderModel" "$SRC" | grep -v "ShowWhatsAppService" || true)
if [ ${#FBM_USES[@]} -eq 0 ]; then
  echo -e "  ${GREEN}✓ FlowBuilderModel só aparece dentro do ShowWhatsAppService.${NC}"
else
  echo "  ${#FBM_USES[@]} ocorrência(s):"
  printf '  %s\n' "${FBM_USES[@]}"
fi

# ---------- 4. serialização suspeita (JSON.stringify do whatsapp) ----------
section "4. Serialização suspeita (JSON.stringify / spread do whatsapp)"
mapfile -t SERIAL < <(grep -rnE "JSON\.stringify\s*\(\s*whatsapp\b|\.\.\.whatsapp\b" "${CONSUMERS[@]}" 2>/dev/null || true)
if [ ${#SERIAL[@]} -eq 0 ]; then
  echo -e "  ${GREEN}✓ Nenhuma serialização agressiva encontrada.${NC}"
else
  echo -e "  ${YELLOW}Atenção: se o objeto é serializado inteiro, o front pode estar lendo 'flows' sem você ver no back.${NC}"
  printf '  %s\n' "${SERIAL[@]}"
fi

# ---------- veredito ----------
section "Veredito"
if [ ${#FLOW_HITS[@]} -eq 0 ] && [ ${#SERIAL[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ SAFE: o include de FlowBuilderModel parece ser peso morto.${NC}"
  echo "   Pode remover e adicionar cache Redis curto (30–60s)."
elif [ ${#FLOW_HITS[@]} -gt 0 ]; then
  echo -e "${RED}❌ CUIDADO: há acesso direto a flow/flows em:${NC}"
  printf '   - %s\n' "${FLOW_HITS[@]}"
  echo "   Mantém o include OU popula manualmente só onde precisa."
else
  echo -e "${YELLOW}⚠  REVISAR: não há acesso direto, mas há serialização inteira.${NC}"
  echo "   Confere no front (DevTools → Network) se a resposta traz 'flows'."
fi