import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Student, StatusVideo, StudentVideoWithVideo, Video } from '../lib/types'
import { Button, Card, EmptyState, LevelPill, Spinner, StatusBadge } from '../components/ui'

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [assigned, setAssigned] = useState<StudentVideoWithVideo[]>([])
  const [allVideos, setAllVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [onlyLevel, setOnlyLevel] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [studentRes, assignedRes, videosRes] = await Promise.all([
      supabase.from('students').select('*').eq('id', id).single(),
      supabase
        .from('student_videos')
        .select('*, video:videos(*)')
        .eq('student_id', id),
      supabase.from('videos').select('*').order('nivel').order('ordem'),
    ])

    if (studentRes.error) setError(studentRes.error.message)
    else setStudent(studentRes.data as Student)

    if (assignedRes.error) setError(assignedRes.error.message)
    else setAssigned((assignedRes.data as StudentVideoWithVideo[]) ?? [])

    if (videosRes.error) setError(videosRes.error.message)
    else setAllVideos((videosRes.data as Video[]) ?? [])

    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Ordena os vídeos vinculados por nível e ordem do vídeo
  const assignedSorted = useMemo(
    () =>
      [...assigned].sort(
        (a, b) =>
          (a.video.nivel ?? '').localeCompare(b.video.nivel ?? '') ||
          a.video.ordem - b.video.ordem,
      ),
    [assigned],
  )

  const assignedIds = useMemo(() => new Set(assigned.map((a) => a.video_id)), [assigned])

  // Vídeos ainda não vinculados (opcionalmente filtrados pelo nível do aluno)
  const available = useMemo(
    () =>
      allVideos.filter(
        (v) =>
          !assignedIds.has(v.id) &&
          (!onlyLevel || !student?.nivel || v.nivel === student.nivel),
      ),
    [allVideos, assignedIds, onlyLevel, student],
  )

  async function assignVideo(video: Video) {
    if (!id) return
    // Atualização otimista: adiciona localmente e reconcilia com o banco
    const { data, error } = await supabase
      .from('student_videos')
      .insert({ student_id: id, video_id: video.id, status: 'solicitado' })
      .select('*, video:videos(*)')
      .single()
    if (error) {
      setError(error.message)
      return
    }
    setAssigned((prev) => [...prev, data as StudentVideoWithVideo])
  }

  async function changeStatus(link: StudentVideoWithVideo, status: StatusVideo) {
    if (link.status === status) return
    const prev = assigned
    // otimista
    setAssigned((cur) => cur.map((a) => (a.id === link.id ? { ...a, status } : a)))
    const { error } = await supabase.from('student_videos').update({ status }).eq('id', link.id)
    if (error) {
      setError(error.message)
      setAssigned(prev) // desfaz
    }
  }

  async function removeVideo(link: StudentVideoWithVideo) {
    const prev = assigned
    setAssigned((cur) => cur.filter((a) => a.id !== link.id))
    const { error } = await supabase.from('student_videos').delete().eq('id', link.id)
    if (error) {
      setError(error.message)
      setAssigned(prev)
    }
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
    <div>
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
          <span className="font-semibold text-ink">{assigned.length}</span> vídeo(s) vinculado(s) ·{' '}
          <span className="font-semibold text-assistido">
            {assigned.filter((a) => a.status === 'assistido').length}
          </span>{' '}
          assistido(s)
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent" role="alert">
          {error}
        </p>
      )}

      {/* Vídeos vinculados */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Vídeos do aluno</h2>
          <Button onClick={() => setShowPicker((v) => !v)} variant={showPicker ? 'ghost' : 'primary'}>
            {showPicker ? 'Fechar' : '+ Vincular vídeos'}
          </Button>
        </div>

        {assignedSorted.length === 0 ? (
          <EmptyState
            title="Nenhum vídeo vinculado"
            description="Clique em “Vincular vídeos” para escolher da biblioteca o que este aluno deve assistir."
          />
        ) : (
          <Card className="divide-y divide-line/70">
            {assignedSorted.map((link) => (
              <div key={link.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{link.video.titulo}</p>
                  <div className="mt-1">
                    <LevelPill nivel={link.video.nivel} />
                  </div>
                </div>

                <StatusToggle value={link.status} onChange={(s) => changeStatus(link, s)} />

                <button
                  onClick={() => removeVideo(link)}
                  className="text-xs font-medium text-ink-faint hover:text-accent"
                  title="Desvincular vídeo"
                >
                  Remover
                </button>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* Seletor de vídeos para vincular */}
      {showPicker && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Adicionar da biblioteca</h2>
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

          {available.length === 0 ? (
            <EmptyState
              title="Nada para adicionar"
              description={
                allVideos.length === 0
                  ? 'Cadastre vídeos na aba Vídeos primeiro.'
                  : 'Todos os vídeos elegíveis já estão vinculados. Desmarque o filtro de nível para ver os demais.'
              }
            />
          ) : (
            <Card className="divide-y divide-line/70">
              {available.map((v) => (
                <div key={v.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{v.titulo}</p>
                    <div className="mt-1">
                      <LevelPill nivel={v.nivel} />
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => assignVideo(v)}>
                    + Adicionar
                  </Button>
                </div>
              ))}
            </Card>
          )}
        </section>
      )}
    </div>
  )
}

// Controle segmentado dos dois estados manuais
function StatusToggle({
  value,
  onChange,
}: {
  value: StatusVideo
  onChange: (s: StatusVideo) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:block">
        <StatusBadge status={value} />
      </div>
      <div className="inline-flex overflow-hidden rounded-lg border border-line">
        <button
          onClick={() => onChange('solicitado')}
          className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === 'solicitado' ? 'bg-solicitado-bg text-solicitado' : 'bg-surface text-ink-faint hover:bg-paper'
          }`}
        >
          Solicitado
        </button>
        <button
          onClick={() => onChange('assistido')}
          className={`border-l border-line px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === 'assistido' ? 'bg-assistido-bg text-assistido' : 'bg-surface text-ink-faint hover:bg-paper'
          }`}
        >
          Assistido
        </button>
      </div>
    </div>
  )
}
