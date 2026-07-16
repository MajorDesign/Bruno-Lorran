import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Lesson, Module, Student, StatusVideo } from '../lib/types'
import { BtnCancelar, BtnSalvar, Button, Card, EmptyState, LevelPill, Spinner } from '../components/ui'

interface LessonStatusEntry {
  id: string
  status: StatusVideo
}

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({})
  const [lessonStatus, setLessonStatus] = useState<Record<string, LessonStatusEntry>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onlyLevel, setOnlyLevel] = useState(true)

  // Alterações pendentes (só vão pro banco ao clicar em Salvar)
  const [pending, setPending] = useState<Record<string, '' | StatusVideo>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [studentRes, modulesRes, lessonsRes, slRes] = await Promise.all([
      supabase.from('students').select('*').eq('id', id).single(),
      supabase.from('modules').select('*').order('nivel').order('ordem'),
      supabase.from('lessons').select('*').order('ordem'),
      supabase.from('student_lessons').select('id, lesson_id, status').eq('student_id', id),
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
      for (const r of (slRes.data as { id: string; lesson_id: string; status: StatusVideo }[]) ?? [])
        map[r.lesson_id] = { id: r.id, status: r.status }
      setLessonStatus(map)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const modulesWithLessons = useMemo(
    () =>
      modules.filter(
        (m) =>
          (lessonsByModule[m.id]?.length ?? 0) > 0 &&
          (!onlyLevel || !student?.nivel || m.nivel === student.nivel),
      ),
    [modules, lessonsByModule, onlyLevel, student],
  )

  function lessonValue(lessonId: string): '' | StatusVideo {
    return lessonId in pending ? pending[lessonId] : lessonStatus[lessonId]?.status ?? ''
  }

  const dirtyCount = useMemo(() => {
    let n = 0
    for (const [lid, v] of Object.entries(pending)) if (v !== (lessonStatus[lid]?.status ?? '')) n++
    return n
  }, [pending, lessonStatus])

  const stats = useMemo(() => {
    const values = Object.values(lessonStatus)
    return {
      assistido: values.filter((v) => v.status === 'assistido').length,
      solicitado: values.filter((v) => v.status === 'solicitado').length,
    }
  }, [lessonStatus])

  function discardAll() {
    setPending({})
  }

  async function saveAll() {
    if (!id) return
    setSaving(true)
    setError(null)
    let firstError: string | null = null

    for (const [lessonId, val] of Object.entries(pending)) {
      const persisted = lessonStatus[lessonId]
      const persistedVal = persisted?.status ?? ''
      if (val === persistedVal) continue
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

  return (
    <div className="pb-24">
      <Link to="/alunos" className="text-sm text-ink-soft hover:text-accent">
        ← Alunos
      </Link>

      <header className="mb-7 mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{student.nome}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-ink-soft">
            <LevelPill nivel={student.nivel} />
            {student.email && <span>{student.email}</span>}
          </div>
        </div>
        <div className="text-right text-sm text-ink-soft">
          <span className="font-semibold text-assistido">{stats.assistido}</span> assistida(s) ·{' '}
          <span className="font-semibold text-solicitado">{stats.solicitado}</span> solicitada(s)
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-soft px-3 py-2 text-sm text-red" role="alert">
          {error}
        </p>
      )}

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">Aulas do aluno</h2>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={onlyLevel}
              onChange={(e) => setOnlyLevel(e.target.checked)}
              className="accent-[var(--color-accent)]"
            />
            Só o nível do aluno{student.nivel ? ` (${student.nivel})` : ''}
          </label>
        </div>

        {modulesWithLessons.length === 0 ? (
          <EmptyState
            title="Nenhuma aula disponível"
            description={
              modules.length === 0
                ? 'Cadastre módulos e aulas na aba Módulos primeiro.'
                : 'Nenhum módulo com aulas para este nível. Desmarque o filtro para ver todos.'
            }
          />
        ) : (
          <div className="space-y-4">
            {modulesWithLessons.map((m) => (
              <Card key={m.id} className="overflow-hidden">
                <div className="flex items-center gap-3 border-b border-line bg-paper/60 px-5 py-3">
                  <span className="font-semibold text-ink">{m.nome}</span>
                  <LevelPill nivel={m.nivel} />
                </div>
                <div className="divide-y divide-line/70">
                  {lessonsByModule[m.id].map((lesson) => {
                    const val = lessonValue(lesson.id)
                    const changed = lesson.id in pending && val !== (lessonStatus[lesson.id]?.status ?? '')
                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center gap-4 px-5 py-3 ${changed ? 'bg-accent-soft/40' : ''}`}
                      >
                        <span className="w-6 text-xs text-ink-faint">{lesson.ordem}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">{lesson.nome}</span>
                        {changed && <span className="text-xs font-semibold text-accent">alterado</span>}
                        <LessonStatusSelect
                          value={val}
                          onChange={(s) => setPending((cur) => ({ ...cur, [lesson.id]: s }))}
                        />
                      </div>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Barra de salvar (aparece quando há alterações) */}
      {dirtyCount > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto flex max-w-lg items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3 shadow-[0_12px_30px_-10px_rgba(11,30,70,0.4)]">
          <span className="text-sm font-medium text-ink">{dirtyCount} alteração(ões) não salva(s)</span>
          <div className="flex gap-2">
            <BtnCancelar size="sm" onClick={discardAll} disabled={saving} />
            <BtnSalvar size="sm" onClick={saveAll} disabled={saving} label={saving ? 'Salvando…' : 'Salvar'} />
          </div>
        </div>
      )}
    </div>
  )
}

// Dropdown de status da aula (— / Solicitado / Assistido)
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
