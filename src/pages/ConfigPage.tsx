import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, Spinner } from '../components/ui'

// Limite do plano Supabase Free = 500 MB de banco.
// Se você mudar de plano, ajuste este valor.
const LIMITE_MB = 500

interface TableStat {
  name: string
  bytes: number
  rows: number
}
interface DbStats {
  db_size_bytes: number
  tables: TableStat[]
}

export function ConfigPage() {
  const [stats, setStats] = useState<DbStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.rpc('get_db_stats')
    if (error) setError(error.message)
    else setStats(data as DbStats)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div>
      <header className="mb-7">
        <h1 className="font-display text-2xl font-semibold text-ink">Configurações</h1>
        <p className="mt-1 text-sm text-ink-soft">Uso do banco de dados e detalhes técnicos da plataforma.</p>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-soft px-3 py-2 text-sm text-red" role="alert">
          {error}
        </p>
      )}

      {loading ? <Spinner /> : stats && <DiskUsage stats={stats} onReload={load} />}
    </div>
  )
}

function DiskUsage({ stats, onReload }: { stats: DbStats; onReload: () => void }) {
  const usedMb = stats.db_size_bytes / (1024 * 1024)
  const pct = Math.min(100, (usedMb / LIMITE_MB) * 100)
  const remainingMb = Math.max(0, LIMITE_MB - usedMb)

  const level = pct >= 90 ? 'red' : pct >= 75 ? 'amber' : 'green'
  const barColor = { green: 'bg-assistido', amber: 'bg-solicitado', red: 'bg-red' }[level]
  const textColor = { green: 'text-assistido', amber: 'text-solicitado', red: 'text-red' }[level]

  return (
    <div className="space-y-6">
      {/* Uso do banco */}
      <Card className="p-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Espaço do banco de dados</h2>
            <p className="mt-0.5 text-sm text-ink-soft">Plano atual: Free · limite de {LIMITE_MB} MB</p>
          </div>
          <button onClick={onReload} className="text-sm font-semibold text-accent hover:text-accent-hover">
            Atualizar
          </button>
        </div>

        <div className="flex items-baseline gap-2">
          <span className={`font-display text-4xl font-semibold ${textColor}`}>{usedMb.toFixed(1)}</span>
          <span className="text-lg text-ink-soft">/ {LIMITE_MB} MB usados</span>
        </div>

        <div className="mt-3 h-3 overflow-hidden rounded-full bg-paper">
          <div className={`h-full rounded-full ${barColor} transition-[width]`} style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-2 flex justify-between text-sm">
          <span className={`font-semibold ${textColor}`}>{pct.toFixed(1)}% usado</span>
          <span className="text-ink-soft">{remainingMb.toFixed(1)} MB livres</span>
        </div>

        {level !== 'green' && (
          <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${level === 'red' ? 'bg-red-soft text-red' : 'bg-solicitado-bg text-solicitado'}`}>
            {level === 'red'
              ? '⚠️ Espaço quase esgotado. Considere limpar dados antigos ou migrar para um plano pago.'
              : 'Atenção: uso acima de 75%. Fique de olho no crescimento do banco.'}
          </p>
        )}
      </Card>
    </div>
  )
}
