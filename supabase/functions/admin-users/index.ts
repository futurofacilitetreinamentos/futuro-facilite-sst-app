// Edge Function: criação e exclusão de usuários pelo administrador.
// Deploy: npx supabase functions deploy admin-users --project-ref <ref>
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: caller } = await admin.auth.getUser(token)
  if (!caller.user) return json({ error: 'Não autenticado' }, 401)
  const { data: prof } = await admin.from('profiles').select('role, ativo').eq('id', caller.user.id).single()
  if (!prof || !prof.ativo || prof.role !== 'admin') return json({ error: 'Apenas administradores' }, 403)

  const body = await req.json()

  if (body.action === 'create') {
    const { email, password, nome, cpf, nascimento, role } = body
    if (!email || !nome) return json({ error: 'Informe nome e e-mail' }, 400)
    // Sem senha inicial: cria com senha aleatória; o usuário define a sua em
    // "Esqueci minha senha / primeiro acesso" na tela de login.
    const created = await admin.auth.admin.createUser({
      email, password: password || crypto.randomUUID() + 'Aa1!', email_confirm: true, user_metadata: { nome },
    })
    if (created.error) return json({ error: created.error.message }, 400)
    const id = created.data.user!.id
    const { error } = await admin.from('profiles').update({
      nome, cpf: cpf ?? '', nascimento: nascimento || null, role: role === 'admin' ? 'admin' : 'tecnico',
    }).eq('id', id)
    if (error) return json({ error: error.message }, 400)
    return json({ id })
  }

  if (body.action === 'delete') {
    if (body.id === caller.user.id) return json({ error: 'Você não pode excluir a si mesmo' }, 400)
    const { error } = await admin.auth.admin.deleteUser(body.id)
    if (error) return json({ error: error.message }, 400)
    return json({ ok: true })
  }

  return json({ error: 'Ação desconhecida' }, 400)
})
