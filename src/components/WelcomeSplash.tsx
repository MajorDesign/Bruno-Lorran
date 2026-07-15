import { useEffect, useState } from 'react'

// Preloader de boas-vindas exibido logo após o login (uma vez por sessão).
// A tela de login marca sessionStorage 'bl_welcome' = '1' ao autenticar.
export function WelcomeSplash() {
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>(() =>
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('bl_welcome') === '1'
      ? 'show'
      : 'gone',
  )

  useEffect(() => {
    if (phase !== 'show') return
    sessionStorage.removeItem('bl_welcome')
    const t1 = setTimeout(() => setPhase('fade'), 1800)
    const t2 = setTimeout(() => setPhase('gone'), 2350)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [phase])

  if (phase === 'gone') return null

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center transition-opacity duration-500 ${
        phase === 'fade' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(1100px 760px at 15% 18%, rgba(37,99,235,0.6), transparent 58%),' +
          'radial-gradient(1000px 720px at 85% 85%, rgba(225,29,72,0.55), transparent 55%),' +
          'linear-gradient(135deg, #0a1533 0%, #0c1f4a 48%, #2b0f2e 100%)',
      }}
    >
      <div>
        <p className="font-display text-5xl font-semibold text-white sm:text-6xl">Bruno Lorran</p>
        <div className="mx-auto mt-4 h-0.5 w-16 rounded-full bg-gradient-to-r from-[#60a5fa] to-[#fb7185]" />
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/50">
          Plataforma de Inglês · Acesso autorizado
        </p>
      </div>

      <h1 className="mt-10 text-3xl font-bold text-white sm:text-4xl">Bem-vindo, Administrador</h1>
      <p className="mt-3 text-sm text-white/60">Carregando seu espaço de trabalho…</p>

      <span className="mt-8 h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white" />

      <footer className="absolute bottom-8 text-[11px] font-medium uppercase tracking-[0.22em] text-white/35">
        Desenvolvido por <span className="text-white/70">— Jonathan Lopes</span>
      </footer>
    </div>
  )
}
