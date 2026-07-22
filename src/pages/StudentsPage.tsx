import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Group, Student } from '../lib/types'
import { BtnAlterar, BtnExcluir, BtnNovo, Card, EmptyState, Spinner } from '../components/ui'

interface GroupWithMembers extends Group {
  members: Student[]
}

export function StudentsPage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<GroupWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'todos' | 'individuais' | 'grupo'>('todos')
  const [query, setQuery] = useState('')

  async function load() {
    setLoading(true)
    const [stuRes, grpRes, memRes] = await Promise.all([
      supabase.from('students').select('*').order('nome'),
      supabase.from('groups').select('*').order('nome'),
      supabase.from('group_members').select('group_id, student_id'),
    ])
    if (stuRes.error) setError(stuRes.error.message)
    if (grpRes.error) setError(grpRes.error.message)
    if (memRes.error) setError(memRes.error.message)

    const allStudents = (stuRes.data as Student[]) ?? []
    const byId = new Map(allStudents.map((s) => [s.id, s]))
    const mems = (memRes.data as { group_id: string; student_id: string }[]) ?? []

    const grouped: GroupWithMembers[] = ((grpRes.data as Group[]) ?? []).map((g) => ({
      ...g,
      members: mems.filter((m) => m.group_id === g.id).map((m) => byId.get(m.student_id)).filter(Boolean) as Student[],
    }))

    setStudents(allStudents)
    setGroups(grouped)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const q = query.trim().toLowerCase()
  const filteredIndividuais = students.filter((s) => s.nome.toLowerCase().includes(q))
  const filteredGroups = groups.filter(
    (g) => g.nome.toLowerCase().includes(q) || g.members.some((m) => m.nome.toLowerCase().includes(q)),
  )

  async function handleDeleteStudent(s: Student) {
    if (!confirm(`Excluir o aluno "${s.nome}"? Isso remove vínculos, aulas e agendamentos dele.`)) return
    // Remove as aulas individuais dele na agenda e o vínculo em grupos antes de excluir.
    const evDel = await supabase.from('events').delete().eq('student_id', s.id)
    if (evDel.error) return setError(evDel.error.message)
    await supabase.from('group_members').delete().eq('student_id', s.id)
    const { error } = await supabase.from('students').delete().eq('id', s.id)
    if (error) return setError(error.message)
    load()
  }
  async function handleDeleteGroup(g: GroupWithMembers) {
    if (!confirm(`Excluir o grupo "${g.nome}"? (os alunos continuam cadastrados)`)) return
    const { error } = await supabase.from('groups').delete().eq('id', g.id)
    if (error) return setError(error.message)
    load()
  }

  return (
    <div>
      <header className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Alunos</h1>
          <p className="mt-1 text-sm text-ink-soft">Gerencie alunos, grupos e as aulas de cada um.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/grupos/novo')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink hover:bg-paper"
          >
            + Novo grupo
          </button>
          <BtnNovo label="Novo aluno" onClick={() => navigate('/alunos/novo')} />
        </div>
      </header>

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
          action={<BtnNovo label="Novo aluno" onClick={() => navigate('/alunos/novo')} />}
        />
      ) : (
        <div className="space-y-6">
          {/* Abas + busca */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex overflow-hidden rounded-lg border border-line">
              {(['todos', 'individuais', 'grupo'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`border-l border-line px-3 py-1.5 text-sm font-semibold first:border-l-0 ${
                    tab === t ? 'bg-accent text-white' : 'bg-surface text-ink-soft hover:bg-paper'
                  }`}
                >
                  {t === 'todos' ? 'Todos' : t === 'individuais' ? 'Alunos' : 'Em grupo'}
                </button>
              ))}
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome…"
              className="w-full max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
          </div>

          {/* Aulas em grupo */}
          {tab !== 'individuais' && filteredGroups.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-semibold text-ink">Aulas em grupo</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredGroups.map((g) => (
                  <Card key={g.id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate font-semibold text-ink">{g.nome}</p>
                      <div className="flex shrink-0 gap-2">
                        <BtnAlterar size="sm" onClick={() => navigate(`/grupos/editar/${g.id}`)} />
                        <BtnExcluir size="sm" onClick={() => handleDeleteGroup(g)} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {g.members.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => navigate(`/alunos/${m.id}`)}
                          className="flex items-center gap-2 rounded-full border border-line bg-paper py-1 pl-1 pr-3 text-sm text-ink hover:bg-surface"
                        >
                          <Avatar src={m.foto_url} nome={m.nome} />
                          {m.nome}
                        </button>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Alunos individuais */}
          {tab !== 'grupo' && (
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">Alunos</h2>
            {filteredIndividuais.length === 0 ? (
              <p className="text-sm text-ink-faint">Nenhum aluno{q ? ' para essa busca' : ''}.</p>
            ) : (
              <Card className="divide-y divide-line/70">
                {filteredIndividuais.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar src={s.foto_url} nome={s.nome} />
                    <button
                      onClick={() => navigate(`/alunos/${s.id}`)}
                      className="min-w-0 flex-1 truncate text-left font-medium text-ink hover:text-accent"
                    >
                      {s.nome}
                    </button>
                    {s.telefone && <span className="hidden text-sm text-ink-soft sm:inline">{s.telefone}</span>}
                    <BtnAlterar size="sm" onClick={() => navigate(`/alunos/editar/${s.id}`)} />
                    <BtnExcluir size="sm" onClick={() => handleDeleteStudent(s)} />
                  </div>
                ))}
              </Card>
            )}
          </section>
          )}
        </div>
      )}
    </div>
  )
}

function Avatar({ src, nome }: { src: string | null; nome: string }) {
  if (src) return <img src={src} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
      {nome.charAt(0).toUpperCase()}
    </span>
  )
}
