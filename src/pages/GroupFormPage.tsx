import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Student } from '../lib/types'
import { buildOccupancy, firstConflict, generateWeeklyEvents, type Occupancy, type Slot } from '../lib/schedule'
import { ScheduleFields } from '../components/ScheduleFields'
import { BtnCancelar, BtnSalvar, Card, Field, Spinner, TextInput } from '../components/ui'

export function GroupFormPage() {
  const { id: editId } = useParams<{ id: string }>()
  const isEdit = Boolean(editId)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [members, setMembers] = useState<Set<string>>(new Set())
  const [initialMembers, setInitialMembers] = useState<Set<string>>(new Set())
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [query, setQuery] = useState('')

  // Agenda do grupo
  const [editInfo, setEditInfo] = useState<{ firstStart: string | null; firstEnd: string | null; total: number } | null>(null)
  const [editAgenda, setEditAgenda] = useState(false)
  const [semAulas, setSemAulas] = useState(false)
  const [vezes, setVezes] = useState(1)
  const [slots, setSlots] = useState<Slot[]>([{ weekday: null, hora: '' }])
  const [duracao, setDuracao] = useState(60)
  const [dataInicio, setDataInicio] = useState('')
  const [repetirAte, setRepetirAte] = useState('')
  const [occupancy, setOccupancy] = useState<Occupancy>({})

  useEffect(() => {
    async function load() {
      const [stuRes, grpRes, memRes] = await Promise.all([
        supabase.from('students').select('*').order('nome'),
        isEdit ? supabase.from('groups').select('nome').eq('id', editId!).single() : Promise.resolve(null),
        isEdit ? supabase.from('group_members').select('student_id').eq('group_id', editId!) : Promise.resolve(null),
      ])
      setAllStudents((stuRes.data as Student[]) ?? [])
      if (grpRes && !grpRes.error && grpRes.data) setNome((grpRes.data as { nome: string }).nome)
      if (memRes && memRes.data) {
        const ids = new Set((memRes.data as { student_id: string }[]).map((m) => m.student_id))
        setMembers(new Set(ids))
        setInitialMembers(new Set(ids))
      }

      const allEv = ((await supabase.from('events').select('start_at, end_at, student_id, group_id')).data ?? []) as {
        start_at: string
        end_at: string
        student_id: string | null
        group_id: string | null
      }[]
      setOccupancy(buildOccupancy(allEv, { groupId: isEdit ? editId : undefined }))

      if (isEdit && editId) {
        const meus = allEv
          .filter((e) => e.group_id === editId)
          .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
        setEditInfo({ firstStart: meus[0]?.start_at ?? null, firstEnd: meus[0]?.end_at ?? null, total: meus.length })
      }

      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle(id: string) {
    setMembers((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function startEditAgenda() {
    setEditAgenda(true)
    if (editInfo?.firstStart) {
      const d = new Date(editInfo.firstStart)
      const pad = (n: number) => String(n).padStart(2, '0')
      setDataInicio(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
      if (editInfo.firstEnd) {
        const mins = Math.round((new Date(editInfo.firstEnd).getTime() - new Date(editInfo.firstStart).getTime()) / 60000)
        if (mins > 0) setDuracao(mins)
      }
    }
  }

  const filtered = allStudents.filter((s) => s.nome.toLowerCase().includes(query.trim().toLowerCase()))
  const wantsSchedule = (!isEdit && !semAulas) || (isEdit && editAgenda)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nome.trim()) return setError('Informe o nome do grupo.')
    if (members.size === 0) return setError('Selecione ao menos um aluno para o grupo.')

    const filled = slots.filter((s): s is { weekday: number; hora: string } => s.weekday != null && !!s.hora)
    if (wantsSchedule) {
      if (!dataInicio) return setError('Informe a data de início das aulas.')
      if (filled.length === 0) return setError('Escolha o dia e o horário de cada aula.')
    }

    setSaving(true)

    // Conflito de horário
    const occ = wantsSchedule ? generateWeeklyEvents(dataInicio, filled, duracao, repetirAte || null) : []
    if (occ.length > 0) {
      const rangeStart = occ[0].start
      const rangeEnd = occ[occ.length - 1].end
      const { data: existRaw, error: eEx } = await supabase
        .from('events')
        .select('start_at, end_at, titulo, group_id')
        .lt('start_at', rangeEnd.toISOString())
        .gt('end_at', rangeStart.toISOString())
      if (eEx) return fail(eEx.message)
      const existing = ((existRaw ?? []) as { start_at: string; end_at: string; titulo: string; group_id: string | null }[]).filter(
        (e) => !(isEdit && e.group_id === editId),
      )
      const conflito = firstConflict(occ, existing)
      if (conflito) {
        const quando = conflito.start.toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        return fail(`Conflito de horário: "${conflito.titulo}" já ocupa ${quando}. Escolha outro dia/horário.`)
      }
    }

    // 1) Grupo + membros
    let groupId = editId
    if (isEdit) {
      const { error: e1 } = await supabase.from('groups').update({ nome: nome.trim() }).eq('id', editId!)
      if (e1) return fail(e1.message)
      const toAdd = [...members].filter((id) => !initialMembers.has(id))
      const toRemove = [...initialMembers].filter((id) => !members.has(id))
      if (toRemove.length) {
        const { error: e2 } = await supabase.from('group_members').delete().eq('group_id', editId!).in('student_id', toRemove)
        if (e2) return fail(e2.message)
      }
      if (toAdd.length) {
        const { error: e3 } = await supabase.from('group_members').insert(toAdd.map((sid) => ({ group_id: editId!, student_id: sid })))
        if (e3) return fail(e3.message)
      }
    } else {
      const { data, error: e1 } = await supabase.from('groups').insert({ nome: nome.trim() }).select('id').single()
      if (e1) return fail(e1.message)
      groupId = (data as { id: string }).id
      const { error: e2 } = await supabase.from('group_members').insert([...members].map((sid) => ({ group_id: groupId!, student_id: sid })))
      if (e2) return fail(e2.message)
    }

    // 2) Agenda do grupo
    if (occ.length > 0) {
      if (isEdit) {
        const { error: eDel } = await supabase.from('events').delete().eq('group_id', editId!)
        if (eDel) return fail(eDel.message)
      }
      const rows = occ.map((o) => ({
        titulo: nome.trim(),
        start_at: o.start.toISOString(),
        end_at: o.end.toISOString(),
        student_id: null,
        group_id: groupId,
      }))
      const { error: e4 } = await supabase.from('events').insert(rows)
      if (e4) return fail(e4.message)
    }

    setSaving(false)
    navigate('/alunos')

    function fail(msg: string) {
      setError(msg)
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/alunos" className="text-sm text-ink-soft hover:text-accent">
        ← Alunos
      </Link>
      <h1 className="mb-6 mt-3 font-display text-2xl font-semibold text-ink">{isEdit ? 'Alterar grupo' : 'Novo grupo'}</h1>

      {error && (
        <p className="mb-4 rounded-lg bg-red-soft px-3 py-2 text-sm text-red" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <Field label="Nome do grupo">
            <TextInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Ana e Gabi" />
          </Field>

          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Alunos do grupo — {members.size} selecionado(s)
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome…"
                className="w-48 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
              />
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-ink-faint">Nenhum aluno encontrado.</p>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
                {filtered.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 text-sm hover:bg-paper">
                    <input type="checkbox" checked={members.has(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4 accent-[var(--color-accent)]" />
                    {s.foto_url ? (
                      <img src={s.foto_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                        {s.nome.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="text-ink">{s.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Agenda do grupo */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Agenda de aulas do grupo</h2>
            {!isEdit && (
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={semAulas} onChange={(e) => setSemAulas(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
                Não cadastrar aulas
              </label>
            )}
          </div>

          {isEdit && editInfo && (
            <dl className="mb-4 space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-36 shrink-0 text-ink-faint">Primeira aula</dt>
                <dd className="text-ink">{editInfo.firstStart ? fmtFull(editInfo.firstStart) : 'Nenhuma aula cadastrada'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 shrink-0 text-ink-faint">Aulas na agenda</dt>
                <dd className="text-ink">{editInfo.total}</dd>
              </div>
            </dl>
          )}

          {wantsSchedule ? (
            <>
              <ScheduleFields
                vezes={vezes}
                setVezes={setVezes}
                slots={slots}
                setSlots={setSlots}
                duracao={duracao}
                setDuracao={setDuracao}
                occupancy={occupancy}
                dataInicio={dataInicio}
                setDataInicio={setDataInicio}
                repetirAte={repetirAte}
                setRepetirAte={setRepetirAte}
              />
              {isEdit && <p className="mt-3 text-xs text-solicitado">Ao salvar, isto substitui as aulas atuais do grupo.</p>}
            </>
          ) : (
            isEdit && (
              <button type="button" onClick={startEditAgenda} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-paper">
                {editInfo?.total ? 'Alterar agenda do grupo' : 'Definir agenda do grupo'}
              </button>
            )
          )}
        </Card>

        <div className="flex justify-end gap-2">
          <BtnCancelar onClick={() => navigate('/alunos')} disabled={saving} />
          <BtnSalvar type="submit" disabled={saving || !nome.trim()} label={saving ? 'Salvando…' : 'Salvar'} />
        </div>
      </form>
    </div>
  )
}

function fmtFull(iso: string) {
  const d = new Date(iso)
  const data = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${data} às ${hora}`
}
