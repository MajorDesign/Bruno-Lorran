import { useRef, useState, type ChangeEvent } from 'react'
import { supabase } from '../lib/supabase'

// Upload de foto para o Supabase Storage (bucket público "avatars").
export function PhotoUpload({
  value,
  onChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) {
      setError(upErr.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-28 w-28 overflow-hidden rounded-full border border-line bg-paper">
        {value ? (
          <img src={value} alt="Foto do aluno" className="h-full w-full object-cover" />
        ) : (
          <PlaceholderAvatar />
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-paper disabled:opacity-50"
        >
          {uploading ? 'Enviando…' : value ? 'Trocar foto' : 'Selecionar imagem'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm font-medium text-ink-faint hover:text-red"
          >
            Remover
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red">{error}</p>}
    </div>
  )
}

function PlaceholderAvatar() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full text-ink-faint" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="9" r="4" opacity="0.5" />
      <path d="M4 20a8 8 0 0 1 16 0Z" opacity="0.5" />
    </svg>
  )
}
