import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { NIVEIS, type Module, type ModuleStatus } from '../lib/types'
import { Button, Card, EmptyState, Field, LevelPill, Select, Spinner, TextInput } from '../components/ui'

export function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [statuses, setStatuses] = useState<ModuleStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [modRes, stRes] = await Promise.all([
      supabase.from('modules').select('*').order('nivel').order('ordem'),
      supabase.from('module_statuses').select('*').order('ordem'),
    ])
    if (modRes.error) setError(modRes.error.message)
    else setModules(modRes.data as Module[])
    if (stRes.error) setError(stRes.error.message)
    else setStatuses(stRes.data as ModuleStatus[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div>
      <header className="mb-7">
        <h1 className="font-display text-2xl font-semibold text-ink">Módulos</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Cadastre os módulos (que agrupam os vídeos) e defina os status usados ao vinculá-los aos alunos.
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-soft px-3 py-2 text-sm text-red" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-8">
          <ModulesSection modules={modules} onChange={load} setError={setError} />
          <StatusesSection statuses={statuses} onChange={load} setError={setError} />
        </div>
      )}
    </div>
  )
}

/* ================= Módulos ================= */
function ModulesSection({
  modules,
  onChange,
  setError,
}: {
  modules: Module[]
  onChange: () => void
  setError: (m: string | null) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [nivel, setNivel] = useState('')
  const [ordem, setOrdem] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('modules').insert({
      nome: nome.trim(),
      nivel: nivel || null,
      ordem: ordem ? Number(ordem) : 0,
    })
    setSaving(false)
    if (error) return setError(error.message)
    setNome('')
    setNivel('')
    setOrdem('')
    setShowForm(false)
    onChange()
  }

  async function handleDelete(m: Module) {
    if (!confirm(`Excluir o módulo "${m.nome}"? Os vídeos ficam sem módulo e os vínculos com alunos serão removidos.`))
      return
    const { error } = await supabase.from('modules').delete().eq('id', m.id)
    if (error) return setError(error.message)
    onChange()
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Módulos cadastrados</h2>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? 'ghost' : 'primary'}>
          {showForm ? 'Cancelar' : '+ Novo módulo'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4 p-5">
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Field label="Nome do módulo">
                <TextInput required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Beginner — Grammar & Vocabulary" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Nível">
                <Select value={nivel} onChange={(e) => setNivel(e.target.value)}>
                  <option value="">Selecione…</option>
                  {NIVEIS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="sm:col-span-1">
              <Field label="Ordem">
                <TextInput type="number" min={0} value={ordem} onChange={(e) => setOrdem(e.target.value)} placeholder="0" />
              </Field>
            </div>
            <div className="sm:col-span-6 flex justify-end">
              <Button type="submit" disabled={saving || !nome.trim()}>
                {saving ? 'Salvando…' : 'Cadastrar módulo'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {modules.length === 0 ? (
        <EmptyState title="Nenhum módulo cadastrado" description="Crie o primeiro módulo para organizar os vídeos e vincular aos alunos." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="w-16 px-5 py-3 font-semibold">Ordem</th>
                <th className="px-5 py-3 font-semibold">Módulo</th>
                <th className="px-5 py-3 font-semibold">Nível</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.id} className="border-b border-line/70 last:border-0 hover:bg-paper">
                  <td className="px-5 py-3.5 text-ink-faint">{m.ordem}</td>
                  <td className="px-5 py-3.5 font-medium text-ink">{m.nome}</td>
                  <td className="px-5 py-3.5">
                    <LevelPill nivel={m.nivel} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => handleDelete(m)} className="text-xs font-medium text-ink-faint hover:text-red">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  )
}

/* ================= Status personalizados ================= */
const CORES_PRESET = ['#1d4ed8', '#e11d48', '#b0741a', '#1f8a5b', '#7c3aed', '#0ea5e9', '#db2777', '#64748b']

function StatusesSection({
  statuses,
  onChange,
  setError,
}: {
  statuses: ModuleStatus[]
  onChange: () => void
  setError: (m: string | null) => void
}) {
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState(CORES_PRESET[0])
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('module_statuses').insert({
      nome: nome.trim(),
      cor,
      ordem: statuses.length,
    })
    setSaving(false)
    if (error) return setError(error.message)
    setNome('')
    setCor(CORES_PRESET[0])
    onChange()
  }

  async function handleDelete(s: ModuleStatus) {
    if (!confirm(`Excluir o status "${s.nome}"? Ele será removido dos módulos que o utilizam.`)) return
    const { error } = await supabase.from('module_statuses').delete().eq('id', s.id)
    if (error) return setError(error.message)
    onChange()
  }

  return (
    <section>
      <div className="mb-1 flex items-center gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">Status dos módulos</h2>
      </div>
      <p className="mb-3 text-sm text-ink-soft">
        Crie os status que você usará ao vincular um módulo a um aluno (ex.: Solicitado, Em andamento, Concluído).
      </p>

      <Card className="p-5">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1">
            <Field label="Nome do status">
              <TextInput required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Em andamento" />
            </Field>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint">Cor</span>
            <div className="flex items-center gap-1.5">
              {CORES_PRESET.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition ${cor === c ? 'border-ink' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
          <Button type="submit" disabled={saving || !nome.trim()}>
            {saving ? 'Salvando…' : '+ Adicionar status'}
          </Button>
        </form>

        <div className="mt-5 border-t border-line pt-4">
          {statuses.length === 0 ? (
            <p className="py-2 text-sm text-ink-faint">Nenhum status cadastrado ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm font-semibold"
                  style={{ color: s.cor }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.cor }} />
                  {s.nome}
                  <button
                    onClick={() => handleDelete(s)}
                    className="ml-0.5 text-ink-faint hover:text-red"
                    title="Excluir status"
                    aria-label={`Excluir status ${s.nome}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>
    </section>
  )
}
