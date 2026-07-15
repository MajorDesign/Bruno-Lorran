import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { NIVEIS } from '../lib/types'
import { Card, Spinner } from '../components/ui'

interface Stats {
  totalAlunos: number
  totalModulos: number
  totalVideos: number
  totalSolicitados: number
  totalAssistidos: number
  alunosPorNivel: { nivel: string; count: number }[]
  videosPorNivel: { nivel: string; count: number }[]
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [alunosRes, modulosRes, videosRes, vinculosRes] = await Promise.all([
        supabase.from('students').select('nivel'),
        supabase.from('modules').select('id'),
        supabase.from('videos').select('nivel'),
        supabase.from('student_videos').select('status'),
      ])

      const err = alunosRes.error || modulosRes.error || videosRes.error || vinculosRes.error
      if (err) {
        setError(err.message)
        return
      }

      const alunos = (alunosRes.data ?? []) as { nivel: string | null }[]
      const modulos = (modulosRes.data ?? []) as { id: string }[]
      const videos = (videosRes.data ?? []) as { nivel: string | null }[]
      const vinculos = (vinculosRes.data ?? []) as { status: string }[]

      setStats({
        totalAlunos: alunos.length,
        totalModulos: modulos.length,
        totalVideos: videos.length,
        totalSolicitados: vinculos.filter((v) => v.status === 'solicitado').length,
        totalAssistidos: vinculos.filter((v) => v.status === 'assistido').length,
        alunosPorNivel: agrupaPorNivel(alunos),
        videosPorNivel: agrupaPorNivel(videos),
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
      {/* Cabeçalho */}
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
            to="/videos"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            + Novo vídeo
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          label="Alunos cadastrados"
          value={stats.totalAlunos}
          hint="no sistema"
          tone="blue"
          icon={<UsersIcon />}
        />
        <Kpi
          label="Módulos cadastrados"
          value={stats.totalModulos}
          hint="na plataforma"
          tone="violet"
          icon={<ModulesIcon />}
        />
        <Kpi
          label="Vídeos cadastrados"
          value={stats.totalVideos}
          hint="na biblioteca"
          tone="red"
          icon={<VideoIcon />}
        />
        <Kpi
          label="Vídeos solicitados"
          value={stats.totalSolicitados}
          hint="aguardando assistir"
          tone="amber"
          icon={<SendIcon />}
        />
        <Kpi
          label="Vídeos assistidos"
          value={stats.totalAssistidos}
          hint="confirmados"
          tone="green"
          icon={<CheckIcon />}
        />
      </div>

      {/* Painéis por nível */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NivelPanel
          title="Alunos por nível"
          data={stats.alunosPorNivel}
          empty="Nenhum aluno cadastrado ainda."
          barClass="bg-accent"
        />
        <NivelPanel
          title="Vídeos por nível"
          data={stats.videosPorNivel}
          empty="Nenhum vídeo cadastrado ainda."
          barClass="bg-red"
        />
      </div>
    </div>
  )
}

/* ---------- KPI tile ---------- */
type Tone = 'blue' | 'violet' | 'red' | 'amber' | 'green'

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
  const tones: Record<Tone, string> = {
    blue: 'bg-accent-soft text-accent',
    violet: 'bg-[#ede9fe] text-[#7c3aed]',
    red: 'bg-red-soft text-red',
    amber: 'bg-solicitado-bg text-solicitado',
    green: 'bg-assistido-bg text-assistido',
  }
  return (
    <Card className="p-5">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 font-display text-4xl font-semibold leading-none text-ink">{value}</p>
      <p className="mt-1.5 text-xs text-ink-soft">{hint}</p>
    </Card>
  )
}

/* ---------- Painel de distribuição por nível ---------- */
function NivelPanel({
  title,
  data,
  empty,
  barClass,
}: {
  title: string
  data: { nivel: string; count: number }[]
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

      {total === 0 ? (
        <p className="py-6 text-center text-sm text-ink-faint">{empty}</p>
      ) : (
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.nivel}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{d.nivel}</span>
                <span className="tabular-nums text-ink-soft">{d.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper">
                <div
                  className={`h-full rounded-full ${barClass}`}
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ---------- Helpers ---------- */
function agrupaPorNivel(rows: { nivel: string | null }[]) {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const k = r.nivel ?? 'Sem nível'
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  // Ordena pela sequência oficial de níveis; "Sem nível" e extras vão ao fim.
  const ordered = [...NIVEIS, 'Sem nível']
  const result = ordered
    .filter((n) => counts.has(n))
    .map((n) => ({ nivel: n, count: counts.get(n)! }))
  for (const [k, v] of counts) if (!ordered.includes(k)) result.push({ nivel: k, count: v })
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
function VideoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
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
