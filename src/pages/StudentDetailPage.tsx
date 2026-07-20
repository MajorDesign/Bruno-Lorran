import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Lesson, Module, Student, StatusVideo } from '../lib/types'
import { BtnCancelar, BtnSalvar, Button, Card, EmptyState, LevelPill, Spinner } from '../components/ui'

interface LessonStatusEntry {
  id: string
  status: StatusVideo
  status_at: string
}

interface AgendaLite {
  id: string
  titulo: string
  start_at: string
  end_at: string
  status: 'pendente' | 'realizada' | 'cancelada' | null
  anotacoes_prof: string | null
}

type StatusFilter = 'todos' | '' | 'solicitado' | 'assistido'

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<Student | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({})
  const [lessonStatus, setLessonStatus] = useState<Record<string, LessonStatusEntry>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('todos')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [agenda, setAgenda] = useState<AgendaLite[]>([])

  // Alterações pendentes (só vão pro banco ao clicar em Salvar)
  const [pending, setPending] = useState<Record<string, '' | StatusVideo>>({})
  const [saving, setSaving] = useState(false)

  // Edição manual da data do status
  const [editingDateId, setEditingDateId] = useState<string | null>(null)
  const [dateDraft, setDateDraft] = useState('')
  const [savingDate, setSavingDate] = useState(false)

  function startEditDate(lessonId: string, iso: string) {
    setEditingDateId(lessonId)
    setDateDraft(toLocalInput(iso))
  }

  async function saveDate(lessonId: string, entryId: string) {
    if (!dateDraft) return
    setSavingDate(true)
    setError(null)
    const iso = new Date(dateDraft).toISOString()
    const { error } = await supabase.from('student_lessons').update({ status_at: iso }).eq('id', entryId)
    setSavingDate(false)
    if (error) {
      setError(error.message)
      return
    }
    setLessonStatus((cur) => ({ ...cur, [lessonId]: { ...cur[lessonId], status_at: iso } }))
    setEditingDateId(null)
  }

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [studentRes, modulesRes, lessonsRes, slRes] = await Promise.all([
      supabase.from('students').select('*').eq('id', id).single(),
      supabase.from('modules').select('*').order('ordem'),
      supabase.from('lessons').select('*').order('ordem'),
      supabase.from('student_lessons').select('id, lesson_id, status, status_at').eq('student_id', id),
    ])

    if (studentRes.error) setError(studentRes.error.message)
    else setStudent(studentRes.data as Student)
    if (modulesRes.error) setError(modulesRes.error.message)
    else setModules((modulesRes.data as Module[]) ?? [])
    if (lessonsRes.error) setError(lessonsRes.error.message)
    else {
      const grouped: Record<string, Lesson[]> = {}
      for (const l of (lessonsRes.data as Lesson[]) ?? []) (grouped[l.module_id] ??= []).push(l)
      setLessonsByModule(grouped)
    }
    if (slRes.error) setError(slRes.error.message)
    else {
      const map: Record<string, LessonStatusEntry> = {}
      for (const r of (slRes.data as (LessonStatusEntry & { lesson_id: string })[]) ?? [])
        map[r.lesson_id] = { id: r.id, status: r.status, status_at: r.status_at }
      setLessonStatus(map)
    }

    // Aulas da agenda (eventos) do aluno + dos grupos dele
    const gmRes = await supabase.from('group_members').select('group_id').eq('student_id', id)
    const gids = ((gmRes.data ?? []) as { group_id: string }[]).map((x) => x.group_id)
    const orParts = [`student_id.eq.${id}`, ...gids.map((g) => `group_id.eq.${g}`)]
    const evRes = await supabase
      .from('events')
      .select('id, titulo, start_at, end_at, status, anotacoes_prof')
      .or(orParts.join(','))
      .order('start_at', { ascending: false })
    setAgenda((evRes.data as AgendaLite[]) ?? [])

    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function persistedStatus(lessonId: string): '' | StatusVideo {
    return lessonStatus[lessonId]?.status ?? ''
  }
  function effectiveStatus(lessonId: string): '' | StatusVideo {
    return lessonId in pending ? pending[lessonId] : persistedStatus(lessonId)
  }

  // Aulas visíveis por módulo (após o filtro de status, baseado no status salvo)
  function visibleLessons(moduleId: string): Lesson[] {
    const list = lessonsByModule[moduleId] ?? []
    if (filter === 'todos') return list
    return list.filter((l) => persistedStatus(l.id) === filter)
  }

  const modulesToShow = useMemo(
    () => modules.filter((m) => visibleLessons(m.id).length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modules, lessonsByModule, lessonStatus, filter],
  )

  const dirtyCount = useMemo(() => {
    let n = 0
    for (const [lid, v] of Object.entries(pending)) if (v !== persistedStatus(lid)) n++
    return n
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, lessonStatus])

  const stats = useMemo(() => {
    const values = Object.values(lessonStatus)
    return {
      assistido: values.filter((v) => v.status === 'assistido').length,
      solicitado: values.filter((v) => v.status === 'solicitado').length,
    }
  }, [lessonStatus])

  function toggleExpand(mid: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(mid) ? next.delete(mid) : next.add(mid)
      return next
    })
  }
  // Com filtro ativo, expande automaticamente para mostrar os resultados
  const isExpanded = (mid: string) => expanded.has(mid)

  async function saveAll() {
    if (!id) return
    setSaving(true)
    setError(null)
    let firstError: string | null = null

    for (const [lessonId, val] of Object.entries(pending)) {
      const persisted = lessonStatus[lessonId]
      if (val === (persisted?.status ?? '')) continue
      let err
      if (val === '') {
        if (persisted) ({ error: err } = await supabase.from('student_lessons').delete().eq('id', persisted.id))
      } else if (persisted) {
        ;({ error: err } = await supabase.from('student_lessons').update({ status: val }).eq('id', persisted.id))
      } else {
        ;({ error: err } = await supabase
          .from('student_lessons')
          .insert({ student_id: id, lesson_id: lessonId, status: val }))
      }
      if (err) {
        firstError = err.message
        break
      }
    }

    setSaving(false)
    if (firstError) {
      setError(firstError)
      return
    }
    setPending({})
    await load()
  }

  if (loading) return <Spinner />
  if (!student)
    return (
      <EmptyState
        title="Aluno não encontrado"
        action={
          <Link to="/alunos">
            <Button variant="ghost">Voltar aos alunos</Button>
          </Link>
        }
      />
    )

  const agNow = Date.now()
  const agProxima = [...agenda]
    .filter((e) => new Date(e.start_at).getTime() >= agNow)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0]
  const agCounts = {
    pendente: agenda.filter((e) => e.status === 'pendente').length,
    realizada: agenda.filter((e) => e.status === 'realizada').length,
    cancelada: agenda.filter((e) => e.status === 'cancelada').length,
  }
  // Histórico mostra só aulas COM anotação do professor
  const historicoComNotas = agenda.filter((e) => e.anotacoes_prof && e.anotacoes_prof.trim())

  return (
    <div className="pb-24">
      <Link to="/alunos" className="text-sm text-ink-soft hover:text-accent">
        ← Alunos
      </Link>

      <p className="mb-3 mt-3 text-xs font-semibold uppercase tracking-widest text-ink-faint">
        Informações do aluno
      </p>

      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
            {student.foto_url ? (
              <img
                src={student.foto_url}
                alt={student.nome}
                className="h-32 w-32 shrink-0 rounded-full border border-line object-cover"
              />
            ) : (
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-accent-soft text-4xl font-bold text-accent">
                {student.nome.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">{student.nome}</h1>
              <dl className="mt-3 space-y-1.5 text-sm">
                <InfoRow label="E-mail" value={student.email} />
                <InfoRow label="Telefone" value={student.telefone} />
                <InfoRow label="CPF" value={student.cpf} />
                <InfoRow label="Nascimento" value={fmtNasc(student.nascimento)} />
                <InfoRow label="Observações" value={student.observacoes} />
              </dl>
              <button
                onClick={() => navigate(`/alunos/editar/${student.id}`)}
                className="mt-3 text-sm font-semibold text-accent hover:underline"
              >
                Editar dados
              </button>
            </div>
          </div>

          <div className="w-full shrink-0 rounded-xl border border-line bg-paper p-4 lg:w-64">
            <CountRow color="#eab308" label="Aulas pendentes" value={agCounts.pendente} />
            <CountRow color="#1f8a5b" label="Aulas realizadas" value={agCounts.realizada} />
            <CountRow color="#e11d48" label="Aulas canceladas" value={agCounts.cancelada} />
          </div>
        </div>
      </Card>

      {error && (
        <p className="mb-4 rounded-lg bg-red-soft px-3 py-2 text-sm text-red" role="alert">
          {error}
        </p>
      )}

      {/* ---------- Aulas (agenda) ---------- */}
      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Aulas (agenda)</h2>

        {agProxima && (
          <Card className="mb-4 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Próxima aula</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="font-display text-lg font-semibold text-ink">{fmtDia(agProxima.start_at)}</span>
              <span className="text-sm text-ink-soft">
                {fmtHora(agProxima.start_at)} – {fmtHora(agProxima.end_at)}
              </span>
              <EventBadge status={agProxima.status} />
            </div>
          </Card>
        )}

        <h3 className="mb-2 text-sm font-semibold text-ink-soft">Histórico das aulas</h3>
        {historicoComNotas.length === 0 ? (
          <EmptyState
            title="Nenhuma anotação registrada"
            description="As anotações que você escrever nas aulas (menu Agenda) aparecem aqui."
          />
        ) : (
          <Card className="max-h-96 divide-y divide-line/70 overflow-y-auto">
            {historicoComNotas.map((e) => (
              <button
                key={e.id}
                onClick={() => navigate(`/agenda?event=${e.id}`)}
                title="Abrir na agenda"
                className="flex w-full gap-4 px-5 py-3 text-left hover:bg-paper"
              >
                <div className="w-24 shrink-0">
                  <p className="font-display text-base font-semibold text-ink">{fmtDia(e.start_at)}</p>
                  <p className="text-xs text-ink-soft">
                    {fmtHora(e.start_at)} – {fmtHora(e.end_at)}
                  </p>
                  <div className="mt-1">
                    <EventBadge status={e.status} />
                  </div>
                </div>
                <div className="min-w-0 flex-1 text-sm text-ink">
                  <p>
                    <span className="text-ink-faint">Detalhes da aula:</span> {e.anotacoes_prof}
                  </p>
                </div>
              </button>
            ))}
          </Card>
        )}
      </section>

      {/* Filtro por status (currículo) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Aulas do aluno (currículo)</h2>
          <p className="text-xs text-ink-soft">
            <span className="font-semibold text-assistido">{stats.assistido}</span> assistida(s) ·{' '}
            <span className="font-semibold text-solicitado">{stats.solicitado}</span> solicitada(s)
          </p>
        </div>
        <StatusFilterBar value={filter} onChange={setFilter} />
      </div>

      {modulesToShow.length === 0 ? (
        <EmptyState
          title={filter === 'todos' ? 'Nenhuma aula disponível' : 'Nenhuma aula com esse status'}
          description={
            modules.length === 0
              ? 'Cadastre módulos e aulas na aba Módulos primeiro.'
              : 'Ajuste o filtro para ver outras aulas.'
          }
        />
      ) : (
        <div className="space-y-3">
          {modulesToShow.map((m) => {
            const lessons = visibleLessons(m.id)
            const open = isExpanded(m.id)
            // resumo do módulo (status salvos)
            const all = lessonsByModule[m.id] ?? []
            const sol = all.filter((l) => persistedStatus(l.id) === 'solicitado').length
            const ass = all.filter((l) => persistedStatus(l.id) === 'assistido').length
            return (
              <Card key={m.id} className="overflow-hidden">
                <button
                  onClick={() => toggleExpand(m.id)}
                  className="flex w-full items-center gap-3 bg-paper/60 px-5 py-3 text-left"
                  aria-expanded={open}
                >
                  <span className={`text-ink-faint transition-transform ${open ? 'rotate-90' : ''}`}>
                    <ChevronIcon />
                  </span>
                  <span className="font-semibold text-ink">{m.nome}</span>
                  <span className="text-xs text-ink-faint">
                    {all.length} {all.length === 1 ? 'aula' : 'aulas'}
                    {sol > 0 && <span className="text-solicitado"> · {sol} solicitada(s)</span>}
                    {ass > 0 && <span className="text-assistido"> · {ass} assistida(s)</span>}
                  </span>
                </button>

                {open && (
                  <div className="max-h-[320px] divide-y divide-line/70 overflow-y-auto border-t border-line">
                    {lessons.map((lesson) => {
                      const val = effectiveStatus(lesson.id)
                      const changed = lesson.id in pending && val !== persistedStatus(lesson.id)
                      const entry = lessonStatus[lesson.id]
                      return (
                        <div
                          key={lesson.id}
                          className={`flex items-center gap-4 px-5 py-3 ${changed ? 'bg-accent-soft/40' : ''}`}
                        >
                          <span className="w-6 text-xs text-ink-faint">{lesson.ordem}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-ink">{lesson.nome}</p>
                            {entry && !changed && editingDateId === lesson.id && (
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <input
                                  type="datetime-local"
                                  value={dateDraft}
                                  onChange={(e) => setDateDraft(e.target.value)}
                                  className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
                                />
                                <BtnSalvar
                                  size="sm"
                                  onClick={() => saveDate(lesson.id, entry.id)}
                                  disabled={savingDate}
                                  label={savingDate ? '…' : 'Salvar data'}
                                />
                                <BtnCancelar size="sm" onClick={() => setEditingDateId(null)} disabled={savingDate} />
                              </div>
                            )}
                            {entry && !changed && editingDateId !== lesson.id && (
                              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                                <span>
                                  {entry.status === 'assistido' ? 'Assistido' : 'Solicitado'} em{' '}
                                  {formatDate(entry.status_at)}
                                </span>
                                <button
                                  onClick={() => startEditDate(lesson.id, entry.status_at)}
                                  className="font-semibold text-accent hover:underline"
                                >
                                  editar data
                                </button>
                              </p>
                            )}
                            {changed && <p className="mt-0.5 text-xs text-accent">alterado — salve para registrar a data</p>}
                          </div>
                          <LevelPill nivel={lesson.nivel} />
                          <LessonStatusSelect
                            value={val}
                            onChange={(s) => setPending((cur) => ({ ...cur, [lesson.id]: s }))}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Barra de salvar */}
      {dirtyCount > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto mt-4 flex max-w-lg items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3 shadow-[0_12px_30px_-10px_rgba(11,30,70,0.4)]">
          <span className="text-sm font-medium text-ink">{dirtyCount} alteração(ões) não salva(s)</span>
          <div className="flex gap-2">
            <BtnCancelar size="sm" onClick={() => setPending({})} disabled={saving} />
            <BtnSalvar size="sm" onClick={saveAll} disabled={saving} label={saving ? 'Salvando…' : 'Salvar'} />
          </div>
        </div>
      )}
    </div>
  )
}

function StatusFilterBar({ value, onChange }: { value: StatusFilter; onChange: (v: StatusFilter) => void }) {
  const opts: { key: StatusFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: '', label: 'Não iniciada' },
    { key: 'solicitado', label: 'Solicitado' },
    { key: 'assistido', label: 'Assistido' },
  ]
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-line">
      {opts.map((o) => (
        <button
          key={o.key || 'nao'}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === o.key ? 'bg-accent text-white' : 'bg-surface text-ink-soft hover:bg-paper'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function LessonStatusSelect({
  value,
  onChange,
}: {
  value: '' | StatusVideo
  onChange: (s: '' | StatusVideo) => void
}) {
  const tone =
    value === 'assistido' ? 'text-assistido' : value === 'solicitado' ? 'text-solicitado' : 'text-ink-faint'
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as '' | StatusVideo)}
      className={`rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold focus:border-accent focus:outline-none ${tone}`}
    >
      <option value="">— não iniciada</option>
      <option value="solicitado">Solicitado</option>
      <option value="assistido">Assistido</option>
    </select>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ISO -> valor do <input type="datetime-local"> (hora local)
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-semibold text-ink-soft">{label}:</dt>
      <dd className="min-w-0 break-words text-ink">{value || '—'}</dd>
    </div>
  )
}

function CountRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2 last:border-0">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm text-ink-soft">{label}</span>
      </div>
      <span className="font-display text-lg font-semibold text-ink">{value}</span>
    </div>
  )
}

function EventBadge({ status }: { status: 'pendente' | 'realizada' | 'cancelada' | null }) {
  if (!status) return <span className="text-xs text-ink-faint">—</span>
  const map = {
    pendente: { label: 'Pendente', cls: 'bg-solicitado-bg text-solicitado' },
    realizada: { label: 'Realizada', cls: 'bg-assistido-bg text-assistido' },
    cancelada: { label: 'Cancelada', cls: 'bg-red-soft text-red' },
  }[status]
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${map.cls}`}>{map.label}</span>
}

function fmtNasc(d: string | null): string | null {
  if (!d) return null
  const [y, m, day] = d.split('-').map(Number)
  if (!y || !m || !day) return d
  const hoje = new Date()
  let idade = hoje.getFullYear() - y
  const mDiff = hoje.getMonth() + 1 - m
  if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < day)) idade--
  return `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y} (${idade} anos)`
}

function fmtDia(iso: string) {
  const d = new Date(iso)
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${dia}/ ${mes.charAt(0).toUpperCase()}${mes.slice(1)}`
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
