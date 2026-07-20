import { Fragment, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Group, Module, Student } from '../lib/types'
import { Card, Field, LevelPill, Select, Spinner } from '../components/ui'

interface LessonFull {
  id: string
  module_id: string
  nome: string
  ordem: number
  nivel: string | null
}
type StatusMap = Record<string, 'solicitado' | 'assistido'>
type StatusGeral = 'Concluído' | 'Em andamento' | 'Não iniciado' | 'Sem aulas'

interface Row {
  key: string
  nome: string
  foto_url: string | null
  isGroup: boolean
  membros?: number
  studentId: string | null
  moduleId: string
  moduleNome: string
  total: number
  nao: number
  sol: number
  ass: number
  statusGeral: StatusGeral
}

const STATUS_OPTS: StatusGeral[] = ['Não iniciado', 'Em andamento', 'Concluído', 'Sem aulas']

export function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<LessonFull[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [groupMembers, setGroupMembers] = useState<{ group_id: string; student_id: string }[]>([])
  const [statusMap, setStatusMap] = useState<StatusMap>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Filtros
  const [tipo, setTipo] = useState<'aluno' | 'grupo'>('aluno')
  const [moduloId, setModuloId] = useState('todos')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusGeral>('todos')
  const [escopoAluno, setEscopoAluno] = useState<'todos' | 'aluno' | 'grupo'>('todos')
  const [alunoId, setAlunoId] = useState('')
  const [grupoIdAluno, setGrupoIdAluno] = useState('')
  const [grupoRelId, setGrupoRelId] = useState('todos')

  useEffect(() => {
    async function load() {
      const [modRes, lesRes, stuRes, grpRes, gmRes, slRes] = await Promise.all([
        supabase.from('modules').select('*').order('ordem'),
        supabase.from('lessons').select('id, module_id, nome, ordem, nivel'),
        supabase.from('students').select('*').order('nome'),
        supabase.from('groups').select('*').order('nome'),
        supabase.from('group_members').select('group_id, student_id'),
        supabase.from('student_lessons').select('student_id, lesson_id, status'),
      ])
      const err = modRes.error || lesRes.error || stuRes.error || grpRes.error || gmRes.error || slRes.error
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
      setModules((modRes.data as Module[]) ?? [])
      setLessons((lesRes.data as LessonFull[]) ?? [])
      setStudents((stuRes.data as Student[]) ?? [])
      setGroups((grpRes.data as Group[]) ?? [])
      setGroupMembers((gmRes.data as { group_id: string; student_id: string }[]) ?? [])
      const map: StatusMap = {}
      for (const r of (slRes.data as { student_id: string; lesson_id: string; status: 'solicitado' | 'assistido' }[]) ?? [])
        map[`${r.student_id}:${r.lesson_id}`] = r.status
      setStatusMap(map)
      setLoading(false)
    }
    load()
  }, [])

  const lessonsByModule = useMemo(() => {
    const m: Record<string, LessonFull[]> = {}
    for (const l of lessons) (m[l.module_id] ??= []).push(l)
    for (const k in m) m[k].sort((a, b) => a.ordem - b.ordem)
    return m
  }, [lessons])

  function statusFrom(total: number, sol: number, ass: number): StatusGeral {
    if (total === 0) return 'Sem aulas'
    if (ass === total) return 'Concluído'
    if (sol + ass === 0) return 'Não iniciado'
    return 'Em andamento'
  }

  const rows = useMemo<Row[]>(() => {
    const mods = moduloId === 'todos' ? modules : modules.filter((m) => m.id === moduloId)
    const out: Row[] = []

    if (tipo === 'aluno') {
      let alunos = students
      if (escopoAluno === 'aluno') alunos = students.filter((s) => s.id === alunoId)
      else if (escopoAluno === 'grupo') {
        const ids = new Set(groupMembers.filter((m) => m.group_id === grupoIdAluno).map((m) => m.student_id))
        alunos = students.filter((s) => ids.has(s.id))
      }
      for (const student of alunos) {
        for (const module of mods) {
          const items = lessonsByModule[module.id] ?? []
          let sol = 0
          let ass = 0
          for (const l of items) {
            const st = statusMap[`${student.id}:${l.id}`]
            if (st === 'solicitado') sol++
            else if (st === 'assistido') ass++
          }
          const total = items.length
          out.push({
            key: `${student.id}-${module.id}`,
            nome: student.nome,
            foto_url: student.foto_url,
            isGroup: false,
            studentId: student.id,
            moduleId: module.id,
            moduleNome: module.nome,
            total,
            nao: total - sol - ass,
            sol,
            ass,
            statusGeral: statusFrom(total, sol, ass),
          })
        }
      }
    } else {
      const grps = grupoRelId === 'todos' ? groups : groups.filter((g) => g.id === grupoRelId)
      for (const group of grps) {
        const memberIds = groupMembers.filter((m) => m.group_id === group.id).map((m) => m.student_id)
        for (const module of mods) {
          const items = lessonsByModule[module.id] ?? []
          let sol = 0
          let ass = 0
          for (const sid of memberIds)
            for (const l of items) {
              const st = statusMap[`${sid}:${l.id}`]
              if (st === 'solicitado') sol++
              else if (st === 'assistido') ass++
            }
          const total = items.length * memberIds.length
          out.push({
            key: `${group.id}-${module.id}`,
            nome: group.nome,
            foto_url: null,
            isGroup: true,
            membros: memberIds.length,
            studentId: null,
            moduleId: module.id,
            moduleNome: module.nome,
            total,
            nao: total - sol - ass,
            sol,
            ass,
            statusGeral: statusFrom(total, sol, ass),
          })
        }
      }
    }

    return statusFiltro === 'todos' ? out : out.filter((r) => r.statusGeral === statusFiltro)
  }, [tipo, students, groups, modules, groupMembers, lessonsByModule, statusMap, escopoAluno, alunoId, grupoIdAluno, grupoRelId, moduloId, statusFiltro])

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function exportarCSV() {
    const primeiro = tipo === 'aluno' ? 'Aluno' : 'Grupo'
    const header = [primeiro, 'Módulo', 'Status geral', 'Não iniciadas', 'Solicitadas', 'Concluídas', 'Total']
    const linhas = rows.map((r) => [r.nome, r.moduleNome, r.statusGeral, r.nao, r.sol, r.ass, r.total])
    downloadCSV(`relatorio-${tipo}.csv`, header, linhas)
  }

  function exportarAulasCSV() {
    const header = ['Aluno', 'Módulo', 'Nº', 'Aula', 'Nível', 'Status']
    const linhas: (string | number)[][] = []
    for (const r of rows) {
      if (r.isGroup || !r.studentId) continue
      for (const l of lessonsByModule[r.moduleId] ?? []) {
        const st = statusMap[`${r.studentId}:${l.id}`]
        const label = st === 'assistido' ? 'Assistido' : st === 'solicitado' ? 'Solicitado' : 'Não iniciada'
        linhas.push([r.nome, r.moduleNome, l.ordem, l.nome, l.nivel ?? '', label])
      }
    }
    downloadCSV('relatorio-aulas.csv', header, linhas)
  }

  if (loading) return <Spinner />

  const faltaSelecao =
    tipo === 'aluno' && ((escopoAluno === 'aluno' && !alunoId) || (escopoAluno === 'grupo' && !grupoIdAluno))

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Relatórios</h1>
        <p className="mt-1 text-sm text-ink-soft">Acompanhe o progresso dos alunos e grupos nos módulos e aulas.</p>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-soft px-3 py-2 text-sm text-red" role="alert">
          {error}
        </p>
      )}

      <Card className="mb-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Tipo de relatório">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'aluno' | 'grupo')}>
              <option value="aluno">Por aluno (módulos)</option>
              <option value="grupo">Por grupo (módulos)</option>
            </Select>
          </Field>
          <Field label="Módulo">
            <Select value={moduloId} onChange={(e) => setModuloId(e.target.value)}>
              <option value="todos">Todos os módulos</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value as 'todos' | StatusGeral)}>
              <option value="todos">Todos os status</option>
              {STATUS_OPTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>

          {tipo === 'aluno' ? (
            <>
              <Field label="Para">
                <Select value={escopoAluno} onChange={(e) => setEscopoAluno(e.target.value as 'todos' | 'aluno' | 'grupo')}>
                  <option value="todos">Todos os alunos</option>
                  <option value="aluno">Um aluno</option>
                  <option value="grupo">Alunos de um grupo</option>
                </Select>
              </Field>
              {escopoAluno === 'aluno' && (
                <Field label="Aluno">
                  <Select value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
                    <option value="">Selecione…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {escopoAluno === 'grupo' && (
                <Field label="Grupo">
                  <Select value={grupoIdAluno} onChange={(e) => setGrupoIdAluno(e.target.value)}>
                    <option value="">Selecione…</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nome}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </>
          ) : (
            <Field label="Grupo">
              <Select value={grupoRelId} onChange={(e) => setGrupoRelId(e.target.value)}>
                <option value="todos">Todos os grupos</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-ink-soft">
          {rows.length} linha(s){tipo === 'aluno' && ' · clique numa linha para ver as aulas'}
        </p>
        {rows.length > 0 && (
          <div className="flex gap-2">
            {tipo === 'aluno' && (
              <button onClick={exportarAulasCSV} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover">
                Exportar aulas (CSV)
              </button>
            )}
            <button onClick={exportarCSV} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-paper">
              Exportar resumo (CSV)
            </button>
          </div>
        )}
      </div>

      {faltaSelecao ? (
        <p className="rounded-lg border border-dashed border-line bg-surface/60 px-6 py-12 text-center text-sm text-ink-faint">
          Selecione {escopoAluno === 'aluno' ? 'um aluno' : 'um grupo'} para ver o relatório.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface/60 px-6 py-12 text-center text-sm text-ink-faint">
          Nada para mostrar com esses filtros.
        </p>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-semibold">{tipo === 'aluno' ? 'Aluno' : 'Grupo'}</th>
                <th className="px-4 py-3 font-semibold">Módulo</th>
                <th className="px-4 py-3 font-semibold">Status geral</th>
                <th className="px-4 py-3 text-center font-semibold">Não iniciadas</th>
                <th className="px-4 py-3 text-center font-semibold">Solicitadas</th>
                <th className="px-4 py-3 text-center font-semibold">Concluídas</th>
                <th className="px-4 py-3 text-center font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const open = expanded.has(r.key)
                return (
                  <Fragment key={r.key}>
                    <tr
                      className={`border-b border-line/70 hover:bg-paper ${r.isGroup ? '' : 'cursor-pointer'}`}
                      onClick={r.isGroup ? undefined : () => toggle(r.key)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!r.isGroup && (
                            <span className={`text-ink-faint transition-transform ${open ? 'rotate-90' : ''}`}>
                              <Chevron />
                            </span>
                          )}
                          <Avatar src={r.foto_url} nome={r.nome} isGroup={r.isGroup} />
                          <span className="font-medium text-ink">
                            {r.nome}
                            {r.isGroup && <span className="ml-1 text-xs font-normal text-ink-faint">({r.membros} aluno(s))</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{r.moduleNome}</td>
                      <td className="px-4 py-3">
                        <StatusGeralBadge status={r.statusGeral} />
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-ink-soft">{r.nao}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-solicitado">{r.sol}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-assistido">{r.ass}</td>
                      <td className="px-4 py-3 text-center tabular-nums font-semibold text-ink">{r.total}</td>
                    </tr>
                    {!r.isGroup && open && (
                      <tr className="border-b border-line/70">
                        <td colSpan={7} className="bg-paper/40 px-4 py-3">
                          <div className="max-h-[320px] overflow-y-auto rounded-lg border border-line bg-surface">
                            {(lessonsByModule[r.moduleId] ?? []).length === 0 ? (
                              <p className="px-4 py-3 text-sm text-ink-faint">Este módulo não tem aulas cadastradas.</p>
                            ) : (
                              (lessonsByModule[r.moduleId] ?? []).map((l) => {
                                const st = r.studentId ? statusMap[`${r.studentId}:${l.id}`] : undefined
                                return (
                                  <div key={l.id} className="flex items-center gap-3 border-b border-line/70 px-4 py-2 last:border-0">
                                    <span className="w-6 text-xs text-ink-faint">{l.ordem}</span>
                                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{l.nome}</span>
                                    <LevelPill nivel={l.nivel} />
                                    <LessonBadge status={st} />
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function downloadCSV(filename: string, header: string[], linhas: (string | number)[][]) {
  const csv = [header, ...linhas].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function Avatar({ src, nome, isGroup }: { src: string | null; nome: string; isGroup: boolean }) {
  if (src) return <img src={src} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isGroup ? 'bg-red-soft text-red' : 'bg-accent-soft text-accent'}`}>
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
  )
}

function StatusGeralBadge({ status }: { status: StatusGeral }) {
  const map: Record<StatusGeral, string> = {
    Concluído: 'bg-assistido-bg text-assistido',
    'Em andamento': 'bg-accent-soft text-accent',
    'Não iniciado': 'bg-solicitado-bg text-solicitado',
    'Sem aulas': 'bg-paper text-ink-faint',
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${map[status]}`}>{status}</span>
}

function LessonBadge({ status }: { status: 'solicitado' | 'assistido' | undefined }) {
  const info =
    status === 'assistido'
      ? { label: 'Assistido', cls: 'bg-assistido-bg text-assistido' }
      : status === 'solicitado'
        ? { label: 'Solicitado', cls: 'bg-solicitado-bg text-solicitado' }
        : { label: 'Não iniciada', cls: 'bg-paper text-ink-faint' }
  return <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${info.cls}`}>{info.label}</span>
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
