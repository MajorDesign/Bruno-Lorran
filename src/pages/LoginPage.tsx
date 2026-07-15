import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const { session, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard'

  if (!loading && session) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    const { error } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    // Sinaliza para exibir o preloader de boas-vindas uma vez após o login.
    sessionStorage.setItem('bl_welcome', '1')
    navigate(from, { replace: true })
  }

  async function handleForgot() {
    setError(null)
    setNotice(null)
    if (!email.trim()) {
      setError('Digite seu e-mail no campo acima para receber o link de redefinição.')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) setError(error.message)
    else setNotice('Se este e-mail estiver cadastrado, enviamos um link de redefinição para ele.')
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
      style={{
        background:
          'radial-gradient(1100px 760px at 12% 16%, rgba(37,99,235,0.55), transparent 58%),' +
          'radial-gradient(1000px 720px at 88% 88%, rgba(225,29,72,0.5), transparent 55%),' +
          'linear-gradient(135deg, #0a1533 0%, #0c1f4a 48%, #2b0f2e 100%)',
      }}
    >
      <Backdrop />

      <div className="relative z-10 w-full max-w-md">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-24px_rgba(2,8,32,0.75)]">
          {/* Barra de acento azul→vermelho (marca sem logo) */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#1d4ed8] via-[#7c3aed] to-[#e11d48]" />

          <div className="px-8 pb-8 pt-9 sm:px-10">
            <header className="text-center">
              <h1 className="font-display text-4xl font-semibold leading-none text-[#0b1220]">
                Bruno Lorran
              </h1>
              <p className="mt-2 text-sm font-semibold tracking-wide text-[#1d4ed8]">
                Plataforma de Inglês
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                Painel do administrador
              </p>
            </header>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <FieldRow
                label="E-mail"
                helper="Use seu e-mail cadastrado"
                icon={<MailIcon />}
              >
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-[#0b1220] placeholder:text-slate-400 transition focus:border-[#1d4ed8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20"
                />
              </FieldRow>

              <FieldRow label="Senha" helper="Mínimo 6 caracteres" icon={<LockIcon />}>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-[#0b1220] placeholder:text-slate-400 transition focus:border-[#1d4ed8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20"
                />
              </FieldRow>

              {error && (
                <p
                  className="rounded-lg border border-[#e11d48]/20 bg-[#e11d48]/8 px-3 py-2 text-sm text-[#c81e43]"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {notice && (
                <p
                  className="rounded-lg border border-[#1d4ed8]/20 bg-[#1d4ed8]/8 px-3 py-2 text-sm text-[#1d4ed8]"
                  role="status"
                >
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#e11d48] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_34px_-10px_rgba(37,99,235,0.7)] transition-[filter,transform] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LoginIcon />
                {submitting ? 'Entrando…' : 'Entrar no sistema'}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <button
                onClick={handleForgot}
                type="button"
                className="text-sm font-semibold text-[#1d4ed8] underline-offset-2 hover:text-[#e11d48] hover:underline"
              >
                Esqueci minha senha
              </button>
              <span className="text-sm text-slate-400"> — receber link por e-mail</span>
            </div>
          </div>
        </div>

        <footer className="mt-6 space-y-1 text-center text-xs text-white/50">
          <p>© 2026 Bruno Lorran · Acesso exclusivo do administrador</p>
          <p>
            Desenvolvido por <span className="font-semibold text-white/75">Jonathan Lopes</span>
          </p>
        </footer>
      </div>
    </div>
  )
}

/* ---------- Campo com rótulo, ícone e texto de ajuda ---------- */
function FieldRow({
  label,
  helper,
  icon,
  children,
}: {
  label: string
  helper: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className="text-[#1d4ed8]">{icon}</span>
        {label}
      </span>
      {children}
      <span className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
        <InfoIcon />
        {helper}
      </span>
    </label>
  )
}

/* ---------- Fundo atmosférico (pontos + feixes diagonais Union Jack) ---------- */
function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
      >
        <defs>
          <pattern id="lg-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1.6" cy="1.6" r="1.6" fill="white" fillOpacity="0.07" />
          </pattern>
          <radialGradient id="lg-fade" cx="50%" cy="42%" r="72%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="lg-mask">
            <rect width="1200" height="800" fill="url(#lg-fade)" />
          </mask>
        </defs>

        {/* Textura de pontos, esmaecendo nas bordas */}
        <rect width="1200" height="800" fill="url(#lg-dots)" mask="url(#lg-mask)" />

        {/* Feixes diagonais (o "X" da Union Jack), bem sutis */}
        <g stroke="white" strokeOpacity="0.045" strokeWidth="96" strokeLinecap="round">
          <line x1="-120" y1="-120" x2="1320" y2="920" />
          <line x1="1320" y1="-120" x2="-120" y2="920" />
        </g>
      </svg>
    </div>
  )
}

/* ---------- Ícones inline ---------- */
function MailIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  )
}
function LoginIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </svg>
  )
}
