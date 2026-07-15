import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { NIVEIS, type Student } from '../lib/types'
import { Button, Card, EmptyState, Field, LevelPill, Select, Spinner, TextInput } from '../components/ui'

export function StudentsPage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [nivel, setNivel] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('nome', { ascending: true })
    if (error) setError(error.message)
    else setStudents(data as Student[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('students').insert({
      nome: nome.trim(),
      email: email.trim() || null,
      nivel: nivel || null,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setNome('')
    setEmail('')
    setNivel('')
    setShowForm(false)
    load()
  }

  async function handleDelete(student: Student) {
    if (!confirm(`Excluir o aluno "${student.nome}"? Isso remove também os vínculos de vídeo dele.`)) return
    const { error } = await supabase.from('students').delete().eq('id', student.id)
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  return (
    <div>
      <header className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Alunos</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Cadastre os alunos e abra cada um para gerenciar os vídeos.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? 'ghost' : 'primary'}>
          {showForm ? 'Cancelar' : '+ Novo aluno'}
        </Button>
      </header>

      {showForm && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Field label="Nome">
                <TextInput required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do aluno" />
              </Field>
            </div>
            <div className="sm:col-span-1">
              <Field label="E-mail">
                <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opcional" />
              </Field>
            </div>
            <div className="sm:col-span-1">
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
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" disabled={saving || !nome.trim()}>
                {saving ? 'Salvando…' : 'Cadastrar aluno'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : students.length === 0 ? (
        <EmptyState
          title="Nenhum aluno cadastrado"
          description="Comece cadastrando o primeiro aluno para vincular os vídeos."
          action={<Button onClick={() => setShowForm(true)}>+ Novo aluno</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3 font-semibold">Nome</th>
                <th className="px-5 py-3 font-semibold">E-mail</th>
                <th className="px-5 py-3 font-semibold">Nível</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-paper"
                  onClick={() => navigate(`/alunos/${s.id}`)}
                >
                  <td className="px-5 py-3.5 font-medium text-ink">{s.nome}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{s.email || '—'}</td>
                  <td className="px-5 py-3.5">
                    <LevelPill nivel={s.nivel} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(s)
                      }}
                      className="text-xs font-medium text-ink-faint hover:text-accent"
                    >
                      Excluir
                    </button>
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
