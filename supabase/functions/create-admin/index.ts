// Edge Function: gerência de administradores da plataforma.
// - Só pode ser chamada por um usuário autenticado (admin logado).
// - Usa a chave service_role (injetada pelo Supabase) para listar/criar/excluir
//   usuários com segurança — a chave NUNCA vai para o frontend.
//
// Deploy: Supabase > Edge Functions > Deploy a new function > nome "create-admin".
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autorizado.' }, 401)

    // Confirma que quem chamou é um usuário autenticado (admin logado).
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const {
      data: { user },
      error: userErr,
    } = await caller.auth.getUser()
    if (userErr || !user) return json({ error: 'Sessão inválida.' }, 401)

    const admin = createClient(url, serviceKey)
    const { action, email, password, id } = await req.json().catch(() => ({}))

    if (action === 'list') {
      const { data, error } = await admin.auth.admin.listUsers()
      if (error) return json({ error: error.message }, 400)
      const admins = data.users
        .map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at }))
        .sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''))
      return json({ admins })
    }

    if (action === 'create') {
      if (!email || !password || String(password).length < 6)
        return json({ error: 'Informe e-mail e senha (mínimo 6 caracteres).' }, 400)
      const { error } = await admin.auth.admin.createUser({
        email: String(email).trim(),
        password: String(password),
        email_confirm: true,
      })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (action === 'delete') {
      if (!id) return json({ error: 'ID do administrador não informado.' }, 400)
      if (id === user.id) return json({ error: 'Você não pode excluir o próprio usuário.' }, 400)
      const { error } = await admin.auth.admin.deleteUser(String(id))
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'Ação inválida.' }, 400)
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500)
  }
})
