import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CORES_EVENTO, type AgendaEvent, type EventStatus, type Group, type Student } from '../lib/types'
import { addDays, addMonths, sameDay, startOfDay } from '../lib/schedule'
import { BtnCancelar, BtnExcluir, BtnNovo, BtnSalvar, Field, Select, Spinner, TextInput } from '../components/ui'

type EventRow = AgendaEvent & { student: { nome: string; foto_url: string | null } | null; group: { nome: string } | null }

const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const STATUS_INFO: Record<EventStatus, { dot: string; label: string }> = {
  realizada: { dot: '#1f8a5b', label: 'Realizada' },
  cancelada: { dot: '#e11d48', label: 'Cancelada' },
  pendente: { dot: '#eab308', label: 'Pendente' },
}
const BAR = '#1e3a8a' // navy da barra lateral dos cards
const WORK_START = 7
const WORK_END = 22

export function AgendaPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'semana' | 'mes'>('semana')
  const [ref, setRef] = useState<Date>(() => new Date())
  const [showFree, setShowFree] = useState(false)
  const [editing, setEditing] = useState<EventRow | 'novo' | null>(null)
  const [novoDia, setNovoDia] = useState<Date | null>(null)
  const [statuses, setStatuses] = useState<(EventStatus | null)[]>([])

  const range = useMemo(() => (view === 'semana' ? weekRange(ref) : monthRange(ref)), [view, ref])

  async function loadCounts() {
    const { data } = await supabase.from('events').select('status')
    setStatuses(((data ?? []) as { status: EventStatus | null }[]).map((r) => r.status))
  }
  useEffect(() => {
    loadCounts()
  }, [])

  const counts = useMemo(
    () => ({
      pendente: statuses.filter((s) => s === 'pendente').length,
      realizada: statuses.filter((s) => s === 'realizada').length,
      cancelada: statuses.filter((s) => s === 'cancelada').length,
    }),
    [statuses],
  )

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*, student:students(nome, foto_url), group:groups(nome)')
      .gte('start_at', range.gridStart.toISOString())
      .lte('start_at', range.gridEnd.toISOString())
    if (error) setError(error.message)
    else setEvents((data as EventRow[]) ?? [])
  }, [range])

  useEffect(() => {
    Promise.all([
      supabase.from('students').select('*').order('nome'),
      supabase.from('groups').select('*').order('nome'),
    ]).then(([s, g]) => {
      if (s.data) setStudents(s.data as Student[])
      if (g.data) setGroups(g.data as Group[])
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    loadEvents().then(() => setLoading(false))
  }, [loadEvents])

  // Abre um evento específico vindo de outra tela (?event=<id>)
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const evId = searchParams.get('event')
    if (!evId) return
    ;(async () => {
      const { data } = await supabase
        .from('events')
        .select('*, student:students(nome, foto_url), group:groups(nome)')
        .eq('id', evId)
        .single()
      if (data) {
        const ev = data as EventRow
        setRef(new Date(ev.start_at))
        setView('semana')
        setEditing(ev)
      }
      searchParams.delete('event')
      setSearchParams(searchParams, { replace: true })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function eventsByDay(day: Date): EventRow[] {
    return events
      .filter((e) => sameDay(new Date(e.start_at), day))
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }
  function move(dir: number) {
    setRef((d) => (view === 'semana' ? addDays(d, dir * 7) : addMonths(d, dir)))
  }
  function novoNoDia(day: Date) {
    setNovoDia(day)
    setEditing('novo')
  }

  return (
    <div>
      {/* Cabeçalho */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">Agenda</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-line">
            <button onClick={() => setView('mes')} className={seg(view === 'mes')}>
              Mês
            </button>
            <button onClick={() => setView('semana')} className={`border-l border-line ${seg(view === 'semana')}`}>
              Semana
            </button>
            <button
              onClick={() => {
                setRef(new Date())
                setView('semana')
              }}
              className="border-l border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-paper"
            >
              Hoje
            </button>
          </div>
          <button
            onClick={() => setShowFree((v) => !v)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
              showFree ? 'border-assistido bg-assistido text-white' : 'border-line bg-surface text-ink-soft hover:bg-paper'
            }`}
          >
            {showFree ? 'Ver aulas' : 'Ver horários vagos'}
          </button>
          <BtnNovo
            label="Novo item"
            onClick={() => {
              setNovoDia(null)
              setEditing('novo')
            }}
          />
        </div>
      </header>

      {/* Resumo de aulas por status */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <SummaryPill label="Aulas pendentes" value={counts.pendente} color="#eab308" />
        <SummaryPill label="Aulas realizadas" value={counts.realizada} color="#1f8a5b" />
        <SummaryPill label="Aulas canceladas" value={counts.cancelada} color="#e11d48" />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-soft px-3 py-2 text-sm text-red" role="alert">
          {error}
        </p>
      )}

      {/* Navegação de período */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => move(-1)} className="rounded-lg border border-line bg-surface px-4 py-2 text-lg text-ink-soft hover:bg-paper" aria-label="Anterior">
          ‹
        </button>
        <p className="font-display text-lg font-semibold text-ink">{range.title}</p>
        <button onClick={() => move(1)} className="rounded-lg border border-line bg-surface px-4 py-2 text-lg text-ink-soft hover:bg-paper" aria-label="Próximo">
          ›
        </button>
      </div>

      {showFree && (
        <p className="mb-3 text-xs text-ink-soft">
          Horários livres considerando o expediente das {WORK_START}h às {WORK_END}h.
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : view === 'semana' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {range.days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              events={eventsByDay(day)}
              showFree={showFree}
              onOpen={setEditing}
              onAdd={() => novoNoDia(day)}
            />
          ))}
        </div>
      ) : (
        <MonthGrid days={range.days} refMonth={ref.getMonth()} eventsByDay={eventsByDay} onOpen={setEditing} />
      )}

      {editing && (
        <EventModal
          event={editing === 'novo' ? null : editing}
          defaultDay={novoDia}
          students={students}
          groups={groups}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            loadEvents()
            loadCounts()
          }}
        />
      )}
    </div>
  )
}

const seg = (active: boolean) =>
  `px-3 py-1.5 text-sm font-semibold ${active ? 'bg-accent text-white' : 'bg-surface text-ink-soft hover:bg-paper'}`

function SummaryPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium text-ink-soft">{label}</span>
      </div>
      <span className="font-display text-xl font-semibold text-ink">{value}</span>
    </div>
  )
}

/* ---------- Coluna do dia (semana) ---------- */
function DayColumn({
  day,
  events,
  showFree,
  onOpen,
  onAdd,
}: {
  day: Date
  events: EventRow[]
  showFree: boolean
  onOpen: (e: EventRow) => void
  onAdd: () => void
}) {
  const isToday = sameDay(day, new Date())
  const free = showFree ? computeFree(day, events) : []
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">{DIAS[day.getDay()]}</span>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
              isToday ? 'bg-accent text-white' : 'text-ink'
            }`}
          >
            {day.getDate()}
          </span>
        </div>
        <button onClick={onAdd} title="Adicionar neste dia" className="text-ink-faint hover:text-accent">
          <PlusMini />
        </button>
      </div>

      <div className="min-h-[560px] space-y-2 p-2">
        {showFree ? (
          free.length === 0 ? (
            <p className="px-1 py-2 text-xs text-ink-faint">Sem horários livres</p>
          ) : (
            free.map(([s, e], i) => (
              <div key={i} className="rounded-md border-l-4 border-assistido bg-assistido-bg px-2 py-1.5">
                <p className="text-xs font-semibold text-assistido">
                  {fmtHM(s)} – {fmtHM(e)}
                </p>
                <p className="text-[11px] text-assistido/80">livre</p>
              </div>
            ))
          )
        ) : events.length === 0 ? (
          <p className="px-1 py-2 text-xs text-ink-faint">—</p>
        ) : (
          events.map((e) => <EventChip key={e.id} e={e} onOpen={onOpen} />)
        )}
      </div>
    </div>
  )
}

function EventChip({ e, onOpen }: { e: EventRow; onOpen: (e: EventRow) => void }) {
  return (
    <button
      onClick={() => onOpen(e)}
      className="flex w-full items-center gap-2 rounded-md border border-line bg-surface px-2 py-2 shadow-sm hover:bg-paper"
      style={{ borderLeft: `4px solid ${e.cor || BAR}` }}
    >
      <EventAvatar src={e.student?.foto_url ?? null} nome={e.titulo} status={e.status} isGroup={!!e.group_id} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold uppercase text-ink">{e.titulo}</span>
        <span className="text-[11px] text-ink-soft">
          {fmtTime(e.start_at)} até {fmtTime(e.end_at)}
        </span>
      </span>
    </button>
  )
}

function EventAvatar({ src, nome, status, isGroup }: { src: string | null; nome: string; status: EventStatus | null; isGroup: boolean }) {
  return (
    <span className="relative shrink-0">
      {src ? (
        <img src={src} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${isGroup ? 'bg-red-soft text-red' : 'bg-accent-soft text-accent'}`}>
          {isGroup ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ) : (
            nome.charAt(0).toUpperCase()
          )}
        </span>
      )}
      {status && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface"
          style={{ backgroundColor: STATUS_INFO[status].dot }}
          title={STATUS_INFO[status].label}
        />
      )}
    </span>
  )
}

function PlusMini() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/* ---------- Mês ---------- */
function MonthGrid({
  days,
  refMonth,
  eventsByDay,
  onOpen,
}: {
  days: Date[]
  refMonth: number
  eventsByDay: (d: Date) => EventRow[]
  onOpen: (e: EventRow) => void
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line">
      <div className="grid grid-cols-7 bg-paper text-center text-xs font-bold text-ink-soft">
        {DIAS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const evs = eventsByDay(day)
          const inMonth = day.getMonth() === refMonth
          const isToday = sameDay(day, new Date())
          return (
            <div key={day.toISOString()} className="min-h-[120px] border-b border-r border-line bg-surface p-1.5">
              <div className={`mb-1 text-xs font-semibold ${isToday ? 'text-accent' : inMonth ? 'text-ink' : 'text-ink-faint'}`}>{day.getDate()}</div>
              <div className="space-y-1">
                {evs.slice(0, 4).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onOpen(e)}
                    className="flex w-full items-center gap-1 rounded border-l-2 px-1 py-0.5 text-left text-[10px] leading-tight text-ink hover:bg-paper"
                    style={{ borderColor: e.cor || BAR }}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: e.status ? STATUS_INFO[e.status].dot : 'var(--color-ink-faint)' }}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {fmtTime(e.start_at)} {e.titulo}
                    </span>
                  </button>
                ))}
                {evs.length > 4 && <p className="px-1 text-[10px] text-ink-faint">+{evs.length - 4}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Modal criar/editar evento ---------- */
function EventModal({
  event,
  defaultDay,
  students,
  groups,
  onClose,
  onSaved,
}: {
  event: EventRow | null
  defaultDay: Date | null
  students: Student[]
  groups: Group[]
  onClose: () => void
  onSaved: () => void
}) {
  const navigate = useNavigate()
  const isEdit = !!event
  const baseStart = event?.start_at ?? defaultStart(defaultDay)
  const baseEnd = event?.end_at ?? defaultEnd(defaultDay)
  const [titulo, setTitulo] = useState(event?.titulo ?? '')
  const [inicio, setInicio] = useState(toLocalInput(baseStart))
  const [fim, setFim] = useState(toLocalInput(baseEnd))
  const [vinculo, setVinculo] = useState(
    event?.group_id ? `g:${event.group_id}` : event?.student_id ? `s:${event.student_id}` : '',
  )
  const [status, setStatus] = useState<EventStatus | ''>(event?.status ?? '')
  const [cor, setCor] = useState(event?.cor || CORES_EVENTO[0])
  const [notasProf, setNotasProf] = useState(event?.anotacoes_prof ?? '')
  const [notasAluno, setNotasAluno] = useState(event?.anotacoes_aluno ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<{ id: string; nome: string; foto_url: string | null }[]>([])

  useEffect(() => {
    if (!event?.group_id) {
      setGroupMembers([])
      return
    }
    ;(async () => {
      const gm = await supabase.from('group_members').select('student_id').eq('group_id', event.group_id!)
      const ids = ((gm.data ?? []) as { student_id: string }[]).map((x) => x.student_id)
      if (!ids.length) return setGroupMembers([])
      const stu = await supabase.from('students').select('id, nome, foto_url').in('id', ids).order('nome')
      setGroupMembers((stu.data as { id: string; nome: string; foto_url: string | null }[]) ?? [])
    })()
  }, [event])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return setError('Informe o título do evento.')
    if (!inicio || !fim) return setError('Informe início e fim.')
    setSaving(true)
    setError(null)
    const payload = {
      titulo: titulo.trim(),
      start_at: new Date(inicio).toISOString(),
      end_at: new Date(fim).toISOString(),
      student_id: vinculo.startsWith('s:') ? vinculo.slice(2) : null,
      group_id: vinculo.startsWith('g:') ? vinculo.slice(2) : null,
      status: status || null,
      cor,
      anotacoes_prof: notasProf.trim() || null,
      anotacoes_aluno: notasAluno.trim() || null,
    }
    const { error: err } = isEdit
      ? await supabase.from('events').update(payload).eq('id', event!.id)
      : await supabase.from('events').insert(payload)
    setSaving(false)
    if (err) return setError(err.message)
    onSaved()
  }

  async function handleDelete() {
    if (!event) return
    if (!confirm('Excluir este evento da agenda?')) return
    const { error: err } = await supabase.from('events').delete().eq('id', event.id)
    if (err) return setError(err.message)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-surface shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold text-ink">{isEdit ? 'Editar evento' : 'Novo evento na agenda'}</h2>
            {isEdit && event?.student_id && (
              <button
                type="button"
                onClick={() => navigate(`/alunos/${event.student_id}`)}
                className="rounded-lg border border-accent/30 bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent hover:text-white"
              >
                Informações do aluno
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEdit && (
              <Select value={status} onChange={(e) => setStatus(e.target.value as EventStatus | '')} className="w-36">
                <option value="">Sem status</option>
                <option value="pendente">Pendente</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
              </Select>
            )}
            <div className="flex gap-1">
              {CORES_EVENTO.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`h-6 w-6 rounded-full border-2 ${cor === c ? 'border-ink' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && <p className="rounded-lg bg-red-soft px-3 py-2 text-sm text-red">{error}</p>}

          <Field label="Título do evento">
            <TextInput required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Aula de Luiz Eduardo" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Início">
              <TextInput type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </Field>
            <Field label="Fim">
              <TextInput type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} />
            </Field>
          </div>

          <Field label="Aluno / Grupo (opcional)">
            <Select value={vinculo} onChange={(e) => setVinculo(e.target.value)}>
              <option value="">Sem vínculo</option>
              <optgroup label="Alunos">
                {students.map((s) => (
                  <option key={s.id} value={`s:${s.id}`}>
                    {s.nome}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Grupos">
                {groups.map((g) => (
                  <option key={g.id} value={`g:${g.id}`}>
                    {g.nome}
                  </option>
                ))}
              </optgroup>
            </Select>
          </Field>

          {groupMembers.length > 0 && (
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Participantes do grupo ({groupMembers.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {groupMembers.map((m) => (
                  <span key={m.id} className="flex items-center gap-2 rounded-full border border-line bg-paper py-1 pl-1 pr-3 text-sm text-ink">
                    {m.foto_url ? (
                      <img src={m.foto_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                        {m.nome.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {m.nome}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!isEdit && (
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as EventStatus | '')}>
                <option value="">Sem status (só calendário)</option>
                <option value="pendente">Pendente (amarela)</option>
                <option value="realizada">Realizada (verde)</option>
                <option value="cancelada">Cancelada (vermelha)</option>
              </Select>
            </Field>
          )}

          <Field label="Anotações do professor">
            <textarea
              value={notasProf}
              onChange={(e) => setNotasProf(e.target.value)}
              rows={3}
              placeholder="Detalhes da atividade…"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
          </Field>

          <Field label="Anotações para o aluno">
            <textarea
              value={notasAluno}
              onChange={(e) => setNotasAluno(e.target.value)}
              rows={2}
              placeholder="Anotações para o aluno"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
          </Field>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <BtnCancelar label="Voltar" onClick={onClose} disabled={saving} />
            <div className="flex gap-2">
              {isEdit && <BtnExcluir onClick={handleDelete} disabled={saving} />}
              <BtnSalvar type="submit" disabled={saving} label={saving ? 'Salvando…' : 'Salvar'} />
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ---------- Horários livres ---------- */
function computeFree(day: Date, events: EventRow[]): [Date, Date][] {
  const wStart = new Date(day)
  wStart.setHours(WORK_START, 0, 0, 0)
  const wEnd = new Date(day)
  wEnd.setHours(WORK_END, 0, 0, 0)

  const busy = events
    .map((e) => [new Date(e.start_at), new Date(e.end_at)] as [Date, Date])
    .filter(([s, e]) => e > wStart && s < wEnd)
    .map(([s, e]) => [s < wStart ? wStart : s, e > wEnd ? wEnd : e] as [Date, Date])
    .sort((a, b) => a[0].getTime() - b[0].getTime())

  const merged: [Date, Date][] = []
  for (const [s, e] of busy) {
    const last = merged[merged.length - 1]
    if (last && s.getTime() <= last[1].getTime()) {
      if (e > last[1]) last[1] = e
    } else merged.push([s, e])
  }

  const free: [Date, Date][] = []
  let cursor = wStart
  for (const [s, e] of merged) {
    if (s > cursor) free.push([cursor, s])
    if (e > cursor) cursor = e
  }
  if (cursor < wEnd) free.push([cursor, wEnd])
  return free.filter(([s, e]) => e.getTime() - s.getTime() >= 15 * 60000)
}

/* ---------- Datas ---------- */
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function fmtHM(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function toLocalInput(v: string | Date): string {
  const d = typeof v === 'string' ? new Date(v) : v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function defaultStart(day: Date | null) {
  const d = day ? new Date(day) : new Date()
  if (day) d.setHours(8, 0, 0, 0)
  else {
    d.setMinutes(0, 0, 0)
    d.setHours(d.getHours() + 1)
  }
  return d
}
function defaultEnd(day: Date | null) {
  const d = defaultStart(day)
  d.setHours(d.getHours() + 1)
  return d
}
function fmtShort(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase()
}
function weekRange(ref: Date) {
  const start = startOfDay(addDays(ref, -ref.getDay()))
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const gridEnd = new Date(addDays(start, 6).getTime() + 86400000 - 1)
  return { days, gridStart: start, gridEnd, title: `${fmtShort(days[0])} – ${fmtShort(days[6])}` }
}
function monthRange(ref: Date) {
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const gridStart = startOfDay(addDays(first, -first.getDay()))
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const gridEnd = new Date(days[41].getTime() + 86400000 - 1)
  const t = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return { days, gridStart, gridEnd, title: t.charAt(0).toUpperCase() + t.slice(1) }
}
