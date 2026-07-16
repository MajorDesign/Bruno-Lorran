import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  BtnCancelar,
  BtnExcluir,
  BtnNovo,
  BtnSalvar,
  Card,
  EmptyState,
  Field,
  Spinner,
  TextInput,
} from '../components/ui'

interface Admin {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
}

export function AdminsPage() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [saving, setSaving] = useState(false)

  async function call(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('create-admin', { body })
    if (error) {
      // Erro de rede/função não publicada
      throw new Error(
        'Não foi possível falar com a função de administradores. ' +
          'Verifique se a Edge Function "create-admin" foi publicada no Supabase.',
      )
    }
    if (data?.error) throw new Error(data.error as string)
    return data
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await call({ action: 'list' })
      setAdmins((data.admins as Admin[]) ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openCreate() {
    setEmail('')
    setSenha('')
    setSenha2('')
    setNotice(null)
    setShowForm(true)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (senha !== senha2) {
      setError('As senhas não conferem.')
      return
    }
    setSaving(true)
    try {
      await call({ action: 'create', email: email.trim(), password: senha })
      setNotice(`Administrador ${email.trim()} criado com sucesso.`)
      setShowForm(false)
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(a: Admin) {
    if (!confirm(`Excluir o administrador "${a.email}"? Ele perderá o acesso à plataforma.`)) return
    setError(null)
    try {
      await call({ action: 'delete', id: a.id })
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div>
      <header className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Administradores</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Quem pode acessar e gerenciar a plataforma. Todo administrador tem acesso total.
          </p>
        </div>
        {!showForm && <BtnNovo label="Novo administrador" onClick={openCreate} />}
      </header>

      {showForm && (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">Novo administrador</h2>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-3">
            <Field label="E-mail">
              <TextInput
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="novo@exemplo.com"
              />
            </Field>
            <Field label="Senha">
              <TextInput
                type="password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="mínimo 6 caracteres"
              />
            </Field>
            <Field label="Confirmar senha">
              <TextInput
                type="password"
                required
                minLength={6}
                value={senha2}
                onChange={(e) => setSenha2(e.target.value)}
                placeholder="repita a senha"
              />
            </Field>
            <div className="flex justify-end gap-2 sm:col-span-3">
              <BtnCancelar onClick={() => setShowForm(false)} disabled={saving} />
              <BtnSalvar
                type="submit"
                disabled={saving || !email.trim() || senha.length < 6}
                label={saving ? 'Criando…' : 'Criar administrador'}
              />
            </div>
          </form>
        </Card>
      )}

      {notice && (
        <p className="mb-4 rounded-lg border border-assistido/20 bg-assistido-bg px-3 py-2 text-sm text-assistido" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-soft px-3 py-2 text-sm text-red" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : admins.length === 0 ? (
        <EmptyState
          title="Nenhum administrador listado"
          description="Se a função ainda não foi publicada, siga o guia de deploy. Caso contrário, cadastre o primeiro."
          action={<BtnNovo label="Novo administrador" onClick={openCreate} />}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3 font-semibold">E-mail</th>
                <th className="px-5 py-3 font-semibold">Último acesso</th>
                <th className="px-5 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-b border-line/70 last:border-0 hover:bg-paper">
                  <td className="px-5 py-3.5 font-medium text-ink">
                    {a.email}
                    {a.id === user?.id && (
                      <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
                        você
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">
                    {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      {a.id !== user?.id && <BtnExcluir size="sm" onClick={() => handleDelete(a)} />}
                    </div>
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
