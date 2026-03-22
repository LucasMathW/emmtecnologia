# Liste as migrations que estão no dist (js) mas não no src (ts)
for file in dist/database/migrations/*.js; do
  base=$(basename "$file" .js)
  if [ ! -f "src/database/migrations/${base}.ts" ]; then
    echo "Falta: ${base}.ts"
  fi
done