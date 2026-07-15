import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { WelcomeSplash } from './WelcomeSplash'

// Shell autenticado no estilo do exemplo: topbar escura + sidebar com ícones.
export function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const initial = (user?.email?.[0] ?? 'A').toUpperCase()

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <WelcomeSplash />

      {/* ---------- Topbar ---------- */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-ink px-4 text-white sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-[#1d4ed8] to-[#e11d48]" />
          <p className="font-display text-lg font-semibold leading-none">Bruno Lorran</p>
          <span className="ml-1 hidden text-[11px] font-medium uppercase tracking-widest text-white/40 sm:inline">
            Plataforma de Inglês
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1d4ed8] to-[#e11d48] text-sm font-bold text-white">
              {initial}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Administrador</p>
              <p className="max-w-[160px] truncate text-[11px] text-white/45" title={user?.email ?? ''}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-lg border border-white/15 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Sair"
            aria-label="Sair"
          >
            <LogoutIcon />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ---------- Sidebar ---------- */}
        <aside className="w-16 shrink-0 border-r border-line bg-surface px-2 py-4 sm:w-56 sm:px-3">
          <nav className="space-y-1">
            <NavItem to="/dashboard" icon={<GaugeIcon />} label="Dashboard" />
            <NavItem to="/alunos" icon={<UsersIcon />} label="Alunos" />
            <NavItem to="/modulos" icon={<ModulesIcon />} label="Módulos" />
            <NavItem to="/videos" icon={<VideoIcon />} label="Vídeos" />
          </nav>
        </aside>

        {/* ---------- Conteúdo ---------- */}
        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) =>
        `relative flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:justify-start ${
          isActive ? 'bg-accent-soft text-accent' : 'text-ink-soft hover:bg-paper'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-accent" />
          )}
          <span className={isActive ? 'text-accent' : 'text-ink-faint'}>{icon}</span>
          <span className="hidden sm:inline">{label}</span>
        </>
      )}
    </NavLink>
  )
}

/* ---------- Ícones ---------- */
function GaugeIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M13.4 12.6 19 7M12 3a9 9 0 1 0 9 9" />
      <path d="M12 3v2M21 12h-2M4.6 6.6l1.4 1.4" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function VideoIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}
function ModulesIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  )
}
function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}
