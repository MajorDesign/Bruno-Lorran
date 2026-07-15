// Tela exibida quando o .env do Supabase ainda não foi configurado.
export function SetupNotice() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-[var(--radius-card)] border border-line bg-surface p-8">
        <p className="font-display text-2xl font-semibold text-ink">Quase lá 👋</p>
        <p className="mt-2 text-sm text-ink-soft">
          A plataforma precisa das credenciais do Supabase para funcionar. Siga os passos:
        </p>

        <ol className="mt-5 space-y-3 text-sm text-ink">
          <li className="flex gap-3">
            <Step n={1} />
            <span>
              Crie um projeto grátis em <strong>supabase.com</strong> e rode o SQL de{' '}
              <code className="rounded bg-paper px-1.5 py-0.5 text-xs">supabase/schema.sql</code>.
            </span>
          </li>
          <li className="flex gap-3">
            <Step n={2} />
            <span>
              Em <strong>Settings → API</strong>, copie a <em>Project URL</em> e a{' '}
              <em>anon public key</em>.
            </span>
          </li>
          <li className="flex gap-3">
            <Step n={3} />
            <span>
              Crie um arquivo <code className="rounded bg-paper px-1.5 py-0.5 text-xs">.env</code> na
              raiz (copie de <code className="rounded bg-paper px-1.5 py-0.5 text-xs">.env.example</code>) e
              preencha as duas variáveis.
            </span>
          </li>
          <li className="flex gap-3">
            <Step n={4} />
            <span>
              Reinicie o servidor (<code className="rounded bg-paper px-1.5 py-0.5 text-xs">npm run dev</code>).
            </span>
          </li>
        </ol>
      </div>
    </div>
  )
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
      {n}
    </span>
  )
}
