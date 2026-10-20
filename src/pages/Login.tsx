import { useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMsg('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) setError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    } else {
      const redirectTo = window.location.origin + window.location.pathname
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) setError(error.message)
      else setMsg('Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.')
    }
    setBusy(false)
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <img src={import.meta.env.BASE_URL + 'logo.jpeg'} alt="Futuro Facilite" />
        <span className="eyebrow">SISTEMA SST</span>
        <h1>{mode === 'login' ? 'Acesso restrito' : 'Recuperar senha'}</h1>
        <p>Futuro Facilite Treinamentos — gestão de Saúde e Segurança do Trabalho para condomínios.</p>
        {!supabaseConfigured && (
          <div className="error-box">
            Banco não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local.
          </div>
        )}
        <label>
          E-mail
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode === 'login' && (
          <label>
            Senha
            <div className="pass-wrap">
              <input
                type={show ? 'text' : 'password'} autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="ghost" onClick={() => setShow(!show)}>{show ? 'Ocultar' : 'Mostrar'}</button>
            </div>
          </label>
        )}
        <div className="login-error">{error}</div>
        {msg && <div className="setup-note">{msg}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Enviar link'}</button>
        <button type="button" className="ghost" onClick={() => { setMode(mode === 'login' ? 'reset' : 'login'); setError(''); setMsg('') }}>
          {mode === 'login' ? 'Esqueci minha senha / primeiro acesso' : 'Voltar ao login'}
        </button>
        <small>(61) 98515-0519 · futurofacilitetreinamentos@gmail.com</small>
      </form>
    </div>
  )
}
