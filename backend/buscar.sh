#!/bin/bash

# 1. Define o array com os arquivos
arquivos=(
    "node_modules/baileys/lib/Socket/messages-recv.js"
    "node_modules/baileys/lib/Utils/decode-wa-message.d.ts"
    "node_modules/baileys/lib/Utils/decode-wa-message.js"
    "node_modules/baileys/lib/Utils/process-message.d.ts"
    "node_modules/baileys/lib/Utils/process-message.js"
)

# 2. Define o padrão de busca (opcional, mas deixa o código mais limpo)
padrao="encPayload\|decryptMessageNode\|decryptPollVote\|secretEncType"

# 3. Loop para percorrer cada arquivo
for arquivo in "${arquivos[@]}"; do
    
    # Verifica se o arquivo realmente existe no sistema
    if [ -f "$arquivo" ]; then
        echo "================================================================"
        echo "🔍 Buscando em: $arquivo"
        echo "================================================================"
        
        # Executa o seu comando grep
        grep -n "$padrao" "$arquivo" -A 20 -B 10
        
        echo -e "\n" # Pula linhas para separar os resultados
    else
        echo "⚠️ Arquivo não encontrado: $arquivo"
    fi
    
done