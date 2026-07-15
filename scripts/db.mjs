// Ferramenta de banco (uso local do desenvolvedor / assistente).
// Lê SUPABASE_DB_URL do .env (gitignored) — nunca commitado nem exposto.
//
// Uso:
//   node scripts/db.mjs tables            -> lista as tabelas do schema public
//   node scripts/db.mjs run <arquivo.sql> -> executa uma migração SQL
//   node scripts/db.mjs query "<sql>"     -> executa um SQL avulso (leitura)
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import pg from 'pg'

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error('ERRO: SUPABASE_DB_URL não encontrado no .env.')
  console.error('Adicione no .env a connection string (Session pooler) do Supabase:')
  console.error('  SUPABASE_DB_URL=postgresql://postgres.xxxx:SENHA@aws-0-...pooler.supabase.com:5432/postgres')
  process.exit(1)
}

const cmd = process.argv[2]
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()

  if (cmd === 'tables') {
    const { rows } = await client.query(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    )
    console.log('Tabelas em public:')
    for (const r of rows) console.log('  -', r.table_name)
  } else if (cmd === 'run') {
    const file = process.argv[3]
    if (!file) {
      console.error('Uso: node scripts/db.mjs run <arquivo.sql>')
      process.exit(1)
    }
    const sql = readFileSync(file, 'utf8')
    await client.query(sql)
    console.log('OK: migração aplicada ->', file)
  } else if (cmd === 'query') {
    const sql = process.argv[3]
    if (!sql) {
      console.error('Uso: node scripts/db.mjs query "<sql>"')
      process.exit(1)
    }
    const { rows } = await client.query(sql)
    console.log(JSON.stringify(rows, null, 2))
  } else {
    console.error('Uso: node scripts/db.mjs [tables | run <arquivo.sql> | query "<sql>"]')
    process.exit(1)
  }
} catch (e) {
  console.error('FALHA:', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
