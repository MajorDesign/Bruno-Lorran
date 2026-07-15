import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Estrutura autenticada: barra lateral fixa + área de conteúdo.
export function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const navItem = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`

  return (
    <div className="flex min-h-full">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col justify-between bg-ink px-5 py-6 text-white">
        <div>
          <div className="px-1">
            <p className="font-display text-xl font-semibold leading-tight">Bruno Lorran</p>
            <p className="mt-0.5 text-xs uppercase tracking-widest text-white/40">Plataforma</p>
          </div>

          <nav className="mt-9 space-y-1">
            <NavLink to="/alunos" className={navItem}>
              <IconStudents /> Alunos
            </NavLink>
            <NavLink to="/videos" className={navItem}>
              <IconVideo /> Vídeos
            </NavLink>
          </nav>
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="truncate px-1 text-xs text-white/40" title={user?.email ?? ''}>
            {user?.email}
          </p>
          <button
            onClick={handleSignOut}
            className="mt-2 w-full rounded-lg px-1 py-1.5 text-left text-sm text-white/60 transition-colors hover:text-white"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-5xl px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function IconStudents() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconVideo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}
