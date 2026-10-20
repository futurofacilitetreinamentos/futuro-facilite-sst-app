import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { ErrorBox, PanelHead, fmtDate } from '../components/ui'
import { useProfiles, useSave } from '../lib/db'
import { errMsg, supabase } from '../lib/supabase'
import type { Profile, Role } from '../lib/types'

export default function ContaPage() {
  const { profile, isAdmin, refreshProfile } = useAuth()
  const [params] = useSearchParams()
  return (
    <div className="view">
      {params.get('nova') === '1' && <div className="ok-box">Defina abaixo a sua nova senha.</div>}
      <MeusDados profile={profile} onSaved={refreshProfile} />
      <TrocarSenha />
      {isAdmin && <Usuarios me={profile?.id} />}
    </div>
  )
}

function MeusDados({ profile, onSaved }: { profile: Profile | null; onSaved: () => Promise<void> }) {
  const [nome, setNome] = useState(profile?.nome ?? '')
  const save = useSave<Partial<Profile>>('profiles')
  if (!profile) return null
  return (
    <form className="panel" onSubmit={async (e) => { e.preventDefault(); await save.mutateAsync({ id: profile.id, nome }); await onSaved() }}>
      <PanelHead eyebrow="MINHA CONTA" title={profile.email}>
        <button className="primary" disabled={save.isPending}>Salvar</button>
      </PanelHead>
      <ErrorBox error={save.error} />
      <div className="form-grid two">
        <label>Nome<input value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label>Perfil<input readOnly value={profile.role === 'admin' ? 'Administrador' : 'Técnico'} /></label>
      </div>
    </form>
  )
}

function TrocarSenha() {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(''); setErr('')
    if (p1.length < 8) return setErr('A senha precisa ter pelo menos 8 caracteres.')
    if (p1 !== p2) return setErr('As senhas não conferem.')
    const { error } = await supabase.auth.updateUser({ password: p1 })
    if (error) setErr(error.message)
    else { setMsg('Senha alterada.'); setP1(''); setP2('') }
  }
  return (
    <form className="panel" onSubmit={submit}>
      <PanelHead eyebrow="SEGURANÇA" title="Alterar senha"><button className="primary">Alterar</button></PanelHead>
      {err && <div className="error-box">{err}</div>}
      {msg && <div className="ok-box">{msg}</div>}
      <div className="form-grid two">
        <label>Nova senha<input type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} /></label>
        <label>Confirmar<input type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} /></label>
      </div>
    </form>
  )
}

async function callAdmin(body: object) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) {
    // a função devolve {error} no corpo; tenta extrair
    const ctx = (error as { context?: Response }).context
    const detail = ctx ? await ctx.json().catch(() => null) : null
    throw new Error(detail?.error ?? errMsg(error))
  }
  return data
}

function Usuarios({ me }: { me?: string }) {
  const { data: users = [] } = useProfiles()
  const save = useSave<Partial<Profile>>('profiles')
  const qc = useQueryClient()
  const [form, setForm] = useState({ nome: '', email: '', cpf: '', nascimento: '', password: '', role: 'tecnico' as Role })
  const [err, setErr] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      await callAdmin({ action: 'create', ...form, cpf: form.cpf.replace(/\D/g, '') })
      setForm({ nome: '', email: '', cpf: '', nascimento: '', password: '', role: 'tecnico' })
      await qc.invalidateQueries({ queryKey: ['profiles'] })
    } catch (x) { setErr(x) } finally { setBusy(false) }
  }

  async function del(u: Profile) {
    if (!confirm(`Excluir o usuário ${u.email}?`)) return
    try {
      await callAdmin({ action: 'delete', id: u.id })
      await qc.invalidateQueries({ queryKey: ['profiles'] })
    } catch (x) { alert(errMsg(x)) }
  }

  return (
    <>
      <section className="panel">
        <PanelHead eyebrow="ADMINISTRAÇÃO" title="Usuários do sistema" />
        <ErrorBox error={save.error} />
        {users.map((u) => (
          <div className="history-item" key={u.id}>
            <div>
              <div className="history-title">
                {u.nome || u.email} {!u.ativo && <span className="badge bad">inativo</span>}
              </div>
              <div className="history-meta">
                {[u.email, u.cpf && `CPF ${u.cpf}`, u.nascimento && `nasc. ${fmtDate(u.nascimento)}`].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="history-actions">
              <select
                value={u.role} disabled={u.id === me} style={{ width: 'auto', marginTop: 0 }}
                onChange={(e) => save.mutate({ id: u.id, role: e.target.value as Role })}
              >
                <option value="tecnico">Técnico</option>
                <option value="admin">Administrador</option>
              </select>
              {u.id !== me && (
                <>
                  <button className="outline small" onClick={() => save.mutate({ id: u.id, ativo: !u.ativo })}>
                    {u.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                  <button className="danger small" onClick={() => del(u)}>Excluir</button>
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      <form className="panel" onSubmit={create}>
        <PanelHead eyebrow="ADMINISTRAÇÃO" title="Criar usuário">
          <button className="primary" disabled={busy}>{busy ? 'Criando…' : 'Criar'}</button>
        </PanelHead>
        <div className="notice">
          Sem senha inicial, o usuário define a própria senha em “Esqueci minha senha / primeiro acesso” na tela de login.
        </div>
        <ErrorBox error={err} />
        <div className="form-grid two">
          <label>Nome *<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
          <label>E-mail *<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>CPF<input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></label>
          <label>Nascimento<input type="date" value={form.nascimento} onChange={(e) => setForm({ ...form, nascimento: e.target.value })} /></label>
          <label>Senha inicial (opcional)<input type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <label>
            Perfil
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="tecnico">Técnico</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
        </div>
      </form>
    </>
  )
}
