import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Field, TextInput } from '../components/ui'

export function LoginPage() {
  const { session, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/alunos'

  // Já logado → vai direto para o app
  if (!loading && session) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl font-semibold text-ink">Bruno Lorran</p>
          <p className="mt-1 text-sm text-ink-soft">Painel do administrador</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[var(--radius-card)] border border-line bg-surface p-7 shadow-sm"
        >
          <Field label="E-mail">
            <TextInput
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />
          </Field>

          <Field label="Senha">
            <TextInput
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-ink-faint">
          Acesso exclusivo do administrador.
        </p>
      </div>
    </div>
  )
}
