import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { NIVEIS, type Video } from '../lib/types'
import { Button, Card, EmptyState, Field, LevelPill, Select, Spinner, TextInput } from '../components/ui'

export function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [nivel, setNivel] = useState('')
  const [ordem, setOrdem] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('nivel', { ascending: true })
      .order('ordem', { ascending: true })
    if (error) setError(error.message)
    else setVideos(data as Video[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('videos').insert({
      titulo: titulo.trim(),
      nivel: nivel || null,
      ordem: ordem ? Number(ordem) : 0,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setTitulo('')
    setNivel('')
    setOrdem('')
    setShowForm(false)
    load()
  }

  async function handleDelete(video: Video) {
    if (!confirm(`Excluir o vídeo "${video.titulo}"? Ele será removido de todos os alunos.`)) return
    const { error } = await supabase.from('videos').delete().eq('id', video.id)
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
          <h1 className="font-display text-2xl font-semibold text-ink">Vídeos</h1>
          <p className="mt-1 text-sm text-ink-soft">
            A biblioteca de vídeos por nível. Depois você vincula estes vídeos a cada aluno.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? 'ghost' : 'primary'}>
          {showForm ? 'Cancelar' : '+ Novo vídeo'}
        </Button>
      </header>

      {showForm && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Field label="Título">
                <TextInput required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Class 01 — Greetings and Farewells" />
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
              <Button type="submit" disabled={saving || !titulo.trim()}>
                {saving ? 'Salvando…' : 'Cadastrar vídeo'}
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
      ) : videos.length === 0 ? (
        <EmptyState
          title="Nenhum vídeo cadastrado"
          description="Cadastre os vídeos da sua biblioteca para poder vinculá-los aos alunos."
          action={<Button onClick={() => setShowForm(true)}>+ Novo vídeo</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="w-16 px-5 py-3 font-semibold">Ordem</th>
                <th className="px-5 py-3 font-semibold">Título</th>
                <th className="px-5 py-3 font-semibold">Nível</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id} className="border-b border-line/70 last:border-0 hover:bg-paper">
                  <td className="px-5 py-3.5 text-ink-faint">{v.ordem}</td>
                  <td className="px-5 py-3.5 font-medium text-ink">{v.titulo}</td>
                  <td className="px-5 py-3.5">
                    <LevelPill nivel={v.nivel} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(v)}
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
