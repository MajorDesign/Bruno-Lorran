import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { WelcomeSplash } from './WelcomeSplash'

// Shell autenticado: topbar + sidebar retrátil em navy escuro; conteúdo claro.
export function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('bl_sidebar') === 'collapsed',
  )

  useEffect(() => {
    localStorage.setItem('bl_sidebar', collapsed ? 'collapsed' : 'expanded')
  }, [collapsed])

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const initial = (user?.email?.[0] ?? 'A').toUpperCase()
  const { pathname } = useLocation()
  const wide = pathname.startsWith('/agenda')

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <WelcomeSplash />

      {/* ---------- Topbar ---------- */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-navy px-3 text-white sm:px-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-label="Alternar menu"
          >
            <MenuIcon />
          </button>
          <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-[#4f7cff] to-[#f43f6e]" />
          <p className="font-display text-lg font-semibold leading-none tracking-tight">Bruno Lorran</p>
          <span className="ml-1 hidden text-[11px] font-semibold uppercase tracking-widest text-white/40 sm:inline">
            Plataforma de Inglês
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#4f7cff] to-[#f43f6e] text-sm font-bold text-white">
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
        {/* ---------- Sidebar retrátil ---------- */}
        <aside
          className={`${collapsed ? 'w-[68px]' : 'w-60'} shrink-0 bg-navy px-2.5 py-4 transition-[width] duration-200 sm:px-3`}
        >
          <nav className="space-y-1">
            <NavItem to="/dashboard" icon={<GaugeIcon />} label="Dashboard" collapsed={collapsed} />
            <NavItem to="/agenda" icon={<CalendarIcon />} label="Agenda" collapsed={collapsed} />
            <NavItem to="/alunos" icon={<UsersIcon />} label="Alunos" collapsed={collapsed} />
            <NavItem to="/modulos" icon={<ModulesIcon />} label="Módulos" collapsed={collapsed} />
            <NavItem to="/relatorios" icon={<ChartIcon />} label="Relatórios" collapsed={collapsed} />
            <NavItem to="/administradores" icon={<ShieldIcon />} label="Administradores" collapsed={collapsed} />
            <NavItem to="/configuracoes" icon={<GearIcon />} label="Configurações" collapsed={collapsed} />
          </nav>
        </aside>

        {/* ---------- Conteúdo ---------- */}
        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className={`mx-auto ${wide ? 'max-w-[1600px]' : 'max-w-6xl'} px-5 py-8 sm:px-8`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function NavItem({
  to,
  icon,
  label,
  collapsed,
}: {
  to: string
  icon: ReactNode
  label: string
  collapsed: boolean
}) {
  return (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
          collapsed ? 'justify-center px-0' : 'px-3'
        } ${isActive ? 'bg-white/12 text-white' : 'text-white/55 hover:bg-white/8 hover:text-white'}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-gradient-to-b from-[#4f7cff] to-[#f43f6e]" />
          )}
          <span className={isActive ? 'text-[#7aa2ff]' : ''}>{icon}</span>
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  )
}

/* ---------- Ícones ---------- */
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
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
function CalendarIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
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
function ChartIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="5" />
      <rect x="12" y="8" width="3" height="9" />
      <rect x="17" y="5" width="3" height="12" />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
function GearIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
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
