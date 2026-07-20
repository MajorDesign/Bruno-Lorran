import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { NIVEIS } from '../lib/types'
import { Card, Spinner } from '../components/ui'

interface Bar {
  label: string
  count: number
}

interface Stats {
  totalAlunos: number
  totalModulos: number
  totalAulas: number
  aulasSolicitadas: number
  aulasAssistidas: number
  aulasPorNivel: Bar[]
  aulasPorModulo: Bar[]
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [alunosRes, modulosRes, aulasRes, slRes] = await Promise.all([
        supabase.from('students').select('id'),
        supabase.from('modules').select('id, nome, ordem'),
        supabase.from('lessons').select('module_id, nivel'),
        supabase.from('student_lessons').select('status'),
      ])

      const err = alunosRes.error || modulosRes.error || aulasRes.error || slRes.error
      if (err) {
        setError(err.message)
        return
      }

      const alunos = (alunosRes.data ?? []) as { id: string }[]
      const modulos = (modulosRes.data ?? []) as { id: string; nome: string; ordem: number }[]
      const aulas = (aulasRes.data ?? []) as { module_id: string; nivel: string | null }[]
      const sl = (slRes.data ?? []) as { status: string }[]

      // Aulas por nível
      const aulasPorNivel = agrupaPorNivel(aulas)

      // Aulas por módulo
      const perModule = new Map<string, number>()
      for (const a of aulas) perModule.set(a.module_id, (perModule.get(a.module_id) ?? 0) + 1)
      const aulasPorModulo = modulos
        .map((m) => ({ label: m.nome, count: perModule.get(m.id) ?? 0 }))
        .filter((b) => b.count > 0)

      setStats({
        totalAlunos: alunos.length,
        totalModulos: modulos.length,
        totalAulas: aulas.length,
        aulasSolicitadas: sl.filter((v) => v.status === 'solicitado').length,
        aulasAssistidas: sl.filter((v) => v.status === 'assistido').length,
        aulasPorNivel,
        aulasPorModulo,
      })
    }
    load()
  }, [])

  const greeting = useMemo(() => saudacao(), [])

  if (error)
    return (
      <p className="rounded-lg bg-red-soft px-3 py-2 text-sm text-red" role="alert">
        {error}
      </p>
    )
  if (!stats) return <Spinner />

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold text-ink">{greeting}, Administrador</h1>
          <span className="rounded-md bg-ink px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Administrador
          </span>
        </div>
        <div className="flex gap-2">
          <Link
            to="/alunos"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            + Novo aluno
          </Link>
          <Link
            to="/modulos"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            + Novo módulo
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Alunos cadastrados" value={stats.totalAlunos} hint="no sistema" tone="blue" icon={<UsersIcon />} />
        <Kpi label="Módulos cadastrados" value={stats.totalModulos} hint="na plataforma" tone="violet" icon={<ModulesIcon />} />
        <Kpi label="Aulas cadastradas" value={stats.totalAulas} hint="dentro dos módulos" tone="blue" icon={<BookIcon />} />
        <Kpi label="Aulas solicitadas" value={stats.aulasSolicitadas} hint="aguardando assistir" tone="amber" icon={<SendIcon />} />
        <Kpi label="Aulas assistidas" value={stats.aulasAssistidas} hint="confirmadas" tone="green" icon={<CheckIcon />} />
      </div>

      {/* Painéis */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarPanel
          title="Aulas por nível"
          data={stats.aulasPorNivel}
          empty="Nenhuma aula com nível ainda."
          barClass="bg-accent"
        />
        <BarPanel
          title="Aulas por módulo"
          data={stats.aulasPorModulo}
          empty="Nenhuma aula cadastrada ainda."
          barClass="bg-red"
        />
      </div>
    </div>
  )
}

/* ---------- KPI tile ---------- */
type Tone = 'blue' | 'violet' | 'amber' | 'green'

function Kpi({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string
  value: number
  hint: string
  tone: Tone
  icon: ReactNode
}) {
  const bg: Record<Tone, string> = {
    blue: '#0a3161', // azul da bandeira
    violet: '#bf0a30', // vermelho da bandeira
    amber: '#b0741a',
    green: '#1f8a5b',
  }
  return (
    <div className="relative overflow-hidden rounded-md text-white shadow-sm" style={{ backgroundColor: bg[tone] }}>
      <div className="p-4">
        <p className="font-display text-4xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-sm font-semibold">{label}</p>
      </div>
      <div className="pointer-events-none absolute right-1 top-2 opacity-25 [&>svg]:h-16 [&>svg]:w-16">{icon}</div>
      <div className="bg-black/10 px-4 py-1.5 text-[11px]">{hint}</div>
    </div>
  )
}

/* ---------- Painel de barras ---------- */
function BarPanel({
  title,
  data,
  empty,
  barClass,
}: {
  title: string
  data: Bar[]
  empty: string
  barClass: string
}) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        <span className="text-sm text-ink-faint">{total} no total</span>
      </div>
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-faint">{empty}</p>
      ) : (
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="min-w-0 truncate pr-2 font-medium text-ink">{d.label}</span>
                <span className="tabular-nums text-ink-soft">{d.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper">
                <div className={`h-full rounded-full ${barClass}`} style={{ width: `${(d.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ---------- Helpers ---------- */
function agrupaPorNivel(rows: { nivel: string | null }[]): Bar[] {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const k = r.nivel ?? 'Sem nível'
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const ordered = [...NIVEIS, 'Sem nível']
  const result: Bar[] = ordered
    .filter((n) => counts.has(n))
    .map((n) => ({ label: n, count: counts.get(n)! }))
  for (const [k, v] of counts) if (!ordered.includes(k)) result.push({ label: k, count: v })
  return result
}

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/* ---------- Ícones ---------- */
function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function ModulesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  )
}
function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  )
}
function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4 12 14.01l-3-3" />
    </svg>
  )
}
