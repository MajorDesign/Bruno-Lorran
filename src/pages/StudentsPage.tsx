import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { NIVEIS, type Student } from '../lib/types'
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

export function StudentsPage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [nivel, setNivel] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('students').select('*').order('nome', { ascending: true })
    if (error) setError(error.message)
    else setStudents(data as Student[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditingId(null)
    setNome('')
    setEmail('')
    setNivel('')
    setShowForm(true)
  }
  function openEdit(s: Student) {
    setEditingId(s.id)
    setNome(s.nome)
    setEmail(s.email ?? '')
    setNivel(s.nivel ?? '')
    setShowForm(true)
  }
  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { nome: nome.trim(), email: email.trim() || null, nivel: nivel || null }
    const { error } = editingId
      ? await supabase.from('students').update(payload).eq('id', editingId)
      : await supabase.from('students').insert(payload)
    setSaving(false)
    if (error) return setError(error.message)
    closeForm()
    load()
  }

  async function handleDelete(student: Student) {
    if (!confirm(`Excluir o aluno "${student.nome}"? Isso remove também os vínculos dele.`)) return
    const { error } = await supabase.from('students').delete().eq('id', student.id)
    if (error) return setError(error.message)
    load()
  }

  return (
    <div>
      <header className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Alunos</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Cadastre os alunos e abra cada um para gerenciar lições e vídeos.
          </p>
        </div>
        {!showForm && <BtnNovo label="Novo aluno" onClick={openCreate} />}
      </header>

      {showForm && (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">
            {editingId ? 'Alterar aluno' : 'Novo aluno'}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <Field label="Nome">
              <TextInput required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do aluno" />
            </Field>
            <Field label="E-mail">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opcional" />
            </Field>
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
            <div className="flex justify-end gap-2 sm:col-span-3">
              <BtnCancelar onClick={closeForm} disabled={saving} />
              <BtnSalvar type="submit" disabled={saving || !nome.trim()} label={saving ? 'Salvando…' : 'Salvar'} />
            </div>
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
      ) : students.length === 0 ? (
        <EmptyState
          title="Nenhum aluno cadastrado"
          description="Comece cadastrando o primeiro aluno."
          action={<BtnNovo label="Novo aluno" onClick={openCreate} />}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3 font-semibold">Nome</th>
                <th className="px-5 py-3 font-semibold">E-mail</th>
                <th className="px-5 py-3 font-semibold">Nível</th>
                <th className="px-5 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-line/70 last:border-0 hover:bg-paper">
                  <td
                    className="cursor-pointer px-5 py-3.5 font-medium text-ink"
                    onClick={() => navigate(`/alunos/${s.id}`)}
                  >
                    {s.nome}
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{s.email || '—'}</td>
                  <td className="px-5 py-3.5">
                    <LevelPill nivel={s.nivel} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-2">
                      <BtnAlterar size="sm" onClick={() => openEdit(s)} />
                      <BtnExcluir size="sm" onClick={() => handleDelete(s)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
