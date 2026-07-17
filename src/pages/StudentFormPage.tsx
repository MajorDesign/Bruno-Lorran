import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DURACOES, RECORRENCIAS, type Recurrence, type Student } from '../lib/types'
import { generateOccurrences } from '../lib/schedule'
import { PhotoUpload } from '../components/PhotoUpload'
import { BtnCancelar, BtnSalvar, Card, Field, Select, Spinner, TextInput } from '../components/ui'

export function StudentFormPage() {
  const { id: editId } = useParams<{ id: string }>()
  const isEdit = Boolean(editId)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editInfo, setEditInfo] = useState<{
    groups: string[]
    firstStart: string | null
    firstEnd: string | null
    total: number
  } | null>(null)
  const [editAgenda, setEditAgenda] = useState(false)

  // Dados do aluno
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

  // Grupo (só na criação)
  const [isGroup, setIsGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [members, setMembers] = useState<Set<string>>(new Set())
  const [allStudents, setAllStudents] = useState<Student[]>([])

  // Agenda (só na criação)
  const [semAulas, setSemAulas] = useState(false)
  const [recorrencia, setRecorrencia] = useState<Recurrence>('semanal')
  const [primeiroDia, setPrimeiroDia] = useState('')
  const [duracao, setDuracao] = useState(60)
  const [repetirAte, setRepetirAte] = useState('')

  useEffect(() => {
    async function load() {
      const [studentsRes, editRes] = await Promise.all([
        supabase.from('students').select('*').order('nome'),
        isEdit ? supabase.from('students').select('*').eq('id', editId!).single() : Promise.resolve(null),
      ])
      if (studentsRes.data) setAllStudents(studentsRes.data as Student[])
      if (editRes && !editRes.error && editRes.data) {
        const s = editRes.data as Student
        setNome(s.nome)
        setEmail(s.email ?? '')
        setTelefone(s.telefone ?? '')
        setObservacoes(s.observacoes ?? '')
        setFotoUrl(s.foto_url)
      }

      // Resumo de agenda/grupo (modo editar)
      if (isEdit && editId) {
        const gmRes = await supabase.from('group_members').select('group_id').eq('student_id', editId)
        const groupIds = ((gmRes.data ?? []) as { group_id: string }[]).map((x) => x.group_id)
        let groupNames: string[] = []
        if (groupIds.length) {
          const gRes = await supabase.from('groups').select('nome').in('id', groupIds)
          groupNames = ((gRes.data ?? []) as { nome: string }[]).map((g) => g.nome)
        }
        const orParts = [`student_id.eq.${editId}`, ...groupIds.map((gid) => `group_id.eq.${gid}`)]
        const evRes = await supabase.from('events').select('start_at, end_at').or(orParts.join(',')).order('start_at')
        const evs = (evRes.data ?? []) as { start_at: string; end_at: string }[]
        setEditInfo({
          groups: groupNames,
          firstStart: evs[0]?.start_at ?? null,
          firstEnd: evs[0]?.end_at ?? null,
          total: evs.length,
        })
      }

      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const diaSemana = useMemo(() => {
    if (!primeiroDia) return ''
    return new Date(primeiroDia).toLocaleDateString('pt-BR', { weekday: 'long' })
  }, [primeiroDia])

  const selectableStudents = allStudents.filter((s) => s.id !== editId)

  function startEditAgenda() {
    setEditAgenda(true)
    if (editInfo?.firstStart) {
      setPrimeiroDia(toLocalInput(editInfo.firstStart))
      if (editInfo.firstEnd) {
        const mins = Math.round((new Date(editInfo.firstEnd).getTime() - new Date(editInfo.firstStart).getTime()) / 60000)
        if (mins > 0) setDuracao(mins)
      }
    }
  }

  function toggleMember(sid: string) {
    setMembers((prev) => {
      const next = new Set(prev)
      next.has(sid) ? next.delete(sid) : next.add(sid)
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!semAulas && !isEdit && !primeiroDia) {
      setError('Selecione o primeiro dia de aula (ou marque "Não cadastrar aulas").')
      return
    }
    if (isGroup && !groupName.trim()) {
      setError('Informe o nome do grupo.')
      return
    }

    setSaving(true)
    const studentPayload = {
      nome: nome.trim(),
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      observacoes: observacoes.trim() || null,
      foto_url: fotoUrl,
    }

    // 1) Cria/atualiza o aluno
    let studentId = editId
    if (isEdit) {
      const { error: e1 } = await supabase.from('students').update(studentPayload).eq('id', editId!)
      if (e1) return fail(e1.message)
    } else {
      const { data, error: e1 } = await supabase.from('students').insert(studentPayload).select('id').single()
      if (e1) return fail(e1.message)
      studentId = (data as { id: string }).id
    }

    // 2) Grupo (só na criação)
    let groupId: string | null = null
    if (!isEdit && isGroup) {
      const { data: g, error: e2 } = await supabase.from('groups').insert({ nome: groupName.trim() }).select('id').single()
      if (e2) return fail(e2.message)
      groupId = (g as { id: string }).id
      const rows = [studentId!, ...members].map((sid) => ({ group_id: groupId!, student_id: sid }))
      const { error: e3 } = await supabase.from('group_members').insert(rows)
      if (e3) return fail(e3.message)
    }

    // 3) Agenda — gera/atualiza os eventos das aulas
    const gerarAgenda = (!isEdit && !semAulas && primeiroDia) || (isEdit && editAgenda && primeiroDia)
    if (gerarAgenda) {
      // No editar, substitui as aulas individuais atuais deste aluno
      if (isEdit) {
        const { error: eDel } = await supabase.from('events').delete().eq('student_id', editId!)
        if (eDel) return fail(eDel.message)
      }
      const start = new Date(primeiroDia)
      const until = repetirAte ? new Date(`${repetirAte}T23:59:59`) : null
      const titulo = isGroup ? groupName.trim() : nome.trim()
      const rows = generateOccurrences(start, recorrencia, until).map((d) => ({
        titulo,
        start_at: d.toISOString(),
        end_at: new Date(d.getTime() + duracao * 60000).toISOString(),
        student_id: groupId ? null : studentId,
        group_id: groupId,
      }))
      if (rows.length > 0) {
        const { error: e4 } = await supabase.from('events').insert(rows)
        if (e4) return fail(e4.message)
      }
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
    <div className="mx-auto max-w-3xl">
      <Link to="/alunos" className="text-sm text-ink-soft hover:text-accent">
        ← Alunos
      </Link>
      <h1 className="mb-6 mt-3 font-display text-2xl font-semibold text-ink">
        {isEdit ? 'Alterar aluno' : 'Novo aluno'}
      </h1>

      {error && (
        <p className="mb-4 rounded-lg bg-red-soft px-3 py-2 text-sm text-red" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados do aluno */}
        <Card className="p-6">
          <div className="mb-5 flex justify-center">
            <PhotoUpload value={fotoUrl} onChange={setFotoUrl} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <TextInput required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do aluno" />
            </Field>
            <Field label="E-mail">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </Field>
            <Field label="Telefone">
              <TextInput value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Observações">
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Anotações sobre o aluno"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* Grupo (só na criação) */}
        {!isEdit && (
          <Card className="p-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isGroup}
                onChange={(e) => setIsGroup(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <span className="font-semibold text-ink">Este aluno faz aulas em grupo</span>
            </label>

            {isGroup && (
              <div className="mt-4 space-y-4">
                <Field label="Nome do grupo">
                  <TextInput value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ex.: Ana e Gabi" />
                </Field>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Outros alunos do grupo
                  </span>
                  {selectableStudents.length === 0 ? (
                    <p className="text-sm text-ink-faint">Nenhum outro aluno cadastrado ainda.</p>
                  ) : (
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
                      {selectableStudents.map((s) => (
                        <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-paper">
                          <input
                            type="checkbox"
                            checked={members.has(s.id)}
                            onChange={() => toggleMember(s.id)}
                            className="h-4 w-4 accent-[var(--color-accent)]"
                          />
                          {s.nome}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Agenda de aulas */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Agenda de aulas</h2>
            {!isEdit && (
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={semAulas}
                  onChange={(e) => setSemAulas(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                Não cadastrar aulas
              </label>
            )}
          </div>

          {/* Resumo no editar */}
          {isEdit && editInfo && (
            <dl className="mb-4 space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-36 shrink-0 text-ink-faint">Grupo</dt>
                <dd className="text-ink">{editInfo.groups.length ? editInfo.groups.join(', ') : 'Sem grupo (individual)'}</dd>
              </div>
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

          {/* Campos de agenda: sempre no criar; no editar quando abre "definir/alterar" */}
          {(!isEdit && !semAulas) || (isEdit && editAgenda) ? (
            <>
              <ScheduleFields
                recorrencia={recorrencia}
                setRecorrencia={setRecorrencia}
                duracao={duracao}
                setDuracao={setDuracao}
                primeiroDia={primeiroDia}
                setPrimeiroDia={setPrimeiroDia}
                repetirAte={repetirAte}
                setRepetirAte={setRepetirAte}
                diaSemana={diaSemana}
              />
              {isEdit && (
                <p className="mt-3 text-xs text-solicitado">
                  Ao salvar, isto substitui as aulas individuais atuais deste aluno.
                </p>
              )}
            </>
          ) : (
            isEdit && (
              <button
                type="button"
                onClick={startEditAgenda}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-paper"
              >
                {editInfo?.total ? 'Alterar agenda de aulas' : 'Definir agenda de aulas'}
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

function ScheduleFields({
  recorrencia,
  setRecorrencia,
  duracao,
  setDuracao,
  primeiroDia,
  setPrimeiroDia,
  repetirAte,
  setRepetirAte,
  diaSemana,
}: {
  recorrencia: Recurrence
  setRecorrencia: (r: Recurrence) => void
  duracao: number
  setDuracao: (n: number) => void
  primeiroDia: string
  setPrimeiroDia: (s: string) => void
  repetirAte: string
  setRepetirAte: (s: string) => void
  diaSemana: string
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Recorrência">
        <Select value={recorrencia} onChange={(e) => setRecorrencia(e.target.value as Recurrence)}>
          {RECORRENCIAS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Duração">
        <Select value={duracao} onChange={(e) => setDuracao(Number(e.target.value))}>
          {DURACOES.map((d) => (
            <option key={d} value={d}>
              {d} minutos
            </option>
          ))}
          {!DURACOES.includes(duracao as (typeof DURACOES)[number]) && <option value={duracao}>{duracao} minutos</option>}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Primeiro dia de aula (data e hora)">
          <TextInput type="datetime-local" value={primeiroDia} onChange={(e) => setPrimeiroDia(e.target.value)} />
        </Field>
        {diaSemana && (
          <p className="mt-1 text-sm text-accent">
            Primeira aula em uma <span className="font-semibold capitalize">{diaSemana}</span>
          </p>
        )}
      </div>
      {recorrencia !== 'nenhuma' && (
        <Field label="Repetir até (opcional)">
          <TextInput type="date" value={repetirAte} onChange={(e) => setRepetirAte(e.target.value)} />
        </Field>
      )}
    </div>
  )
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmtFull(iso: string) {
  const d = new Date(iso)
  const data = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${data} às ${hora}`
}
