// Roda no hook pre-commit (ver .githooks/pre-commit). Calcula o numero do
// commit que esta prestes a ser criado (contagem atual + 1) e grava em
// src/version.json, que o vite.config.js le em build time. Isso evita
// depender de `git rev-list --count HEAD` durante o build no Vercel, cujo
// ambiente de build nao tem um remote git configuravel para aprofundar o
// clone raso (ver CLAUDE.md - secao Versionamento).

import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const versionFilePath = fileURLToPath(new URL('../src/version.json', import.meta.url))

const commitsSoFar = parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim(), 10)
const nextCommitNumber = commitsSoFar + 1
const version = `1.0.${nextCommitNumber}`

writeFileSync(versionFilePath, `${JSON.stringify({ version }, null, 2)}\n`)
execSync(`git add "${versionFilePath}"`)

console.log(`[write-version] src/version.json atualizado para ${version}`)
