import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { NIVEIS, type Lesson, type Module } from '../lib/types'
import {
  BtnAlterar,
  BtnCancelar,
  BtnExcluir,
  BtnNovo,
  BtnSalvar,
  Card,
  EmptyState,
  Field,
  LevelPill,
  Select,
  Spinner,
  TextInput,
} from '../components/ui'

export function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [ordem, setOrdem] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [modRes, lessonRes] = await Promise.all([
      supabase.from('modules').select('*').order('ordem'),
      supabase.from('lessons').select('*').order('ordem'),
    ])
    if (modRes.error) setError(modRes.error.message)
    else setModules(modRes.data as Module[])
    if (lessonRes.error) setError(lessonRes.error.message)
    else {
      const grouped: Record<string, Lesson[]> = {}
      for (const l of lessonRes.data as Lesson[]) (grouped[l.module_id] ??= []).push(l)
      setLessonsByModule(grouped)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditingId(null)
    setNome('')
    setOrdem('')
    setShowForm(true)
  }
  function openEdit(m: Module) {
    setEditingId(m.id)
    setNome(m.nome)
    setOrdem(String(m.ordem))
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { nome: nome.trim(), ordem: ordem ? Number(ordem) : 0 }
    const { error } = editingId
      ? await supabase.from('modules').update(payload).eq('id', editingId)
      : await supabase.from('modules').insert(payload)
    setSaving(false)
    if (error) return setError(error.message)
    closeForm()
    load()
  }

  async function handleDeleteModule(m: Module) {
    if (!confirm(`Excluir o módulo "${m.nome}"? As aulas dele e os vínculos com alunos serão removidos.`)) return
    const { error } = await supabase.from('modules').delete().eq('id', m.id)
    if (error) return setError(error.message)
    load()
  }

  function toggleExpand(mid: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(mid) ? next.delete(mid) : next.add(mid)
      return next
    })
  }

  return (
    <div>
      <header className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Módulos</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Cada módulo agrupa suas aulas. Abra um módulo para gerenciar as aulas dele (o nível fica em cada aula).
          </p>
        </div>
        {!showForm && <BtnNovo label="Novo módulo" onClick={openCreate} />}
      </header>

      {showForm && (
        <Card className="mb-5 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">
            {editingId ? 'Alterar módulo' : 'Novo módulo'}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <Field label="Nome do módulo">
                <TextInput required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Module 1" />
              </Field>
            </div>
            <div className="w-24">
              <Field label="Ordem">
                <TextInput type="number" min={0} value={ordem} onChange={(e) => setOrdem(e.target.value)} placeholder="0" />
              </Field>
            </div>
            <BtnCancelar onClick={closeForm} disabled={saving} />
            <BtnSalvar type="submit" disabled={saving || !nome.trim()} label={saving ? 'Salvando…' : 'Salvar'} />
          </form>
        </Card>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-soft px-3 py-2 text-sm text-red" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : modules.length === 0 ? (
        <EmptyState
          title="Nenhum módulo cadastrado"
          description="Crie o primeiro módulo e depois adicione as aulas dentro dele."
          action={<BtnNovo label="Novo módulo" onClick={openCreate} />}
        />
      ) : (
        <div className="space-y-3">
          {modules.map((m) => (
            <ModuleCard
              key={m.id}
              module={m}
              lessons={lessonsByModule[m.id] ?? []}
              expanded={expanded.has(m.id)}
              onToggle={() => toggleExpand(m.id)}
              onEdit={() => openEdit(m)}
              onDelete={() => handleDeleteModule(m)}
              onLessonsChange={load}
              setError={setError}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ================= Card de módulo (expansível, com aulas) ================= */
function ModuleCard({
  module,
  lessons,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onLessonsChange,
  setError,
}: {
  module: Module
  lessons: Lesson[]
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onLessonsChange: () => void
  setError: (m: string | null) => void
}) {
  const [nome, setNome] = useState('')
  const [nivel, setNivel] = useState('')
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function resetLessonForm() {
    setNome('')
    setNivel('')
    setEditingLessonId(null)
  }

  async function submitLesson(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = editingLessonId
      ? await supabase.from('lessons').update({ nome: nome.trim(), nivel: nivel || null }).eq('id', editingLessonId)
      : await supabase
          .from('lessons')
          .insert({ module_id: module.id, nome: nome.trim(), nivel: nivel || null, ordem: lessons.length + 1 })
    setSaving(false)
    if (error) return setError(error.message)
    resetLessonForm()
    onLessonsChange()
  }

  function editLesson(l: Lesson) {
    setEditingLessonId(l.id)
    setNome(l.nome)
    setNivel(l.nivel ?? '')
  }

  async function deleteLesson(l: Lesson) {
    if (!confirm(`Excluir a aula "${l.nome}"?`)) return
    const { error } = await supabase.from('lessons').delete().eq('id', l.id)
    if (error) return setError(error.message)
    onLessonsChange()
  }

  return (
    <Card>
      {/* Cabeçalho do módulo */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={expanded}>
          <span className={`text-ink-faint transition-transform ${expanded ? 'rotate-90' : ''}`}>
            <ChevronIcon />
          </span>
          <span className="truncate font-semibold text-ink">{module.nome}</span>
          <span className="text-xs text-ink-faint">
            {lessons.length} {lessons.length === 1 ? 'aula' : 'aulas'}
          </span>
        </button>
        <BtnAlterar size="sm" onClick={onEdit} />
        <BtnExcluir size="sm" onClick={onDelete} />
      </div>

      {/* Aulas do módulo */}
      {expanded && (
        <div className="border-t border-line bg-paper/50 px-5 py-4">
          {lessons.length === 0 ? (
            <p className="mb-3 text-sm text-ink-faint">Nenhuma aula neste módulo ainda.</p>
          ) : (
            <ul className="mb-3 max-h-[320px] divide-y divide-line/70 overflow-y-auto rounded-lg border border-line bg-surface">
              {lessons.map((l) => (
                <li key={l.id} className="px-4 py-2.5">
                  {editingLessonId === l.id ? (
                    <form onSubmit={submitLesson} className="flex flex-wrap items-center gap-2">
                      <span className="w-6 text-xs text-ink-faint">{l.ordem}</span>
                      <TextInput value={nome} onChange={(e) => setNome(e.target.value)} className="min-w-[200px] flex-1" autoFocus />
                      <Select value={nivel} onChange={(e) => setNivel(e.target.value)} className="w-40">
                        <option value="">Nível…</option>
                        {NIVEIS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </Select>
                      <BtnSalvar size="sm" type="submit" disabled={saving || !nome.trim()} label={saving ? '…' : 'Salvar'} />
                      <BtnCancelar size="sm" onClick={resetLessonForm} disabled={saving} />
                    </form>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-xs text-ink-faint">{l.ordem}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{l.nome}</span>
                      <LevelPill nivel={l.nivel} />
                      <BtnAlterar size="sm" onClick={() => editLesson(l)} />
                      <BtnExcluir size="sm" onClick={() => deleteLesson(l)} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {editingLessonId === null && (
            <form onSubmit={submitLesson} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1">
                <TextInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Lesson 1 — My Wonderful Family" />
              </div>
              <Select value={nivel} onChange={(e) => setNivel(e.target.value)} className="w-44">
                <option value="">Nível…</option>
                {NIVEIS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              <BtnSalvar type="submit" disabled={saving || !nome.trim()} label={saving ? '…' : 'Adicionar aula'} />
            </form>
          )}
        </div>
      )}
    </Card>
  )
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
