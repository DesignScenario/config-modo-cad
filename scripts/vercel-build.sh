#!/bin/sh
# Script de build do Vercel. Hoje inclui diagnostico temporario do clone git
# (ver md/relatorio-modo-cad.md / CLAUDE.md - secao Versionamento) para investigar
# por que __APP_VERSION__ (baseado em `git rev-list --count HEAD`) fica travado
# em producao. Remover o bloco de diagnostico depois que o problema for resolvido.

echo '=== GIT DIAGNOSTICS (temporario) ==='
git --version
git rev-parse --show-toplevel
echo 'remotes:'
git remote -v
echo "HEAD: $(git rev-parse HEAD)"
echo "is shallow: $(git rev-parse --is-shallow-repository)"
if [ -f .git/shallow ]; then
  echo 'shallow file contents:'
  cat .git/shallow
fi
echo "commit count ANTES do fetch: $(git rev-list --count HEAD)"

echo '=== RODANDO GIT FETCH ==='
git fetch --depth=2147483647
echo "git fetch exit code: $?"
echo "is shallow DEPOIS do fetch: $(git rev-parse --is-shallow-repository)"
echo "commit count DEPOIS do fetch: $(git rev-list --count HEAD)"

echo '=== BUILD ==='
npm run build
