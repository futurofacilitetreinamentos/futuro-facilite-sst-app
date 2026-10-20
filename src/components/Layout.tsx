import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useCondo } from '../state/CondoProvider'

export const NAV: { group: string; items: { to: string; label: string; needsCondo?: boolean }[] }[] = [
  { group: 'Atendimento', items: [
    { to: '/', label: '🏠 Atendimento' },
    { to: '/condominio', label: '🏢 Condomínio' },
    { to: '/agenda', label: '📅 Agenda', needsCondo: true },
    { to: '/inspecao', label: '📋 Inspeção SST', needsCondo: true },
  ] },
  { group: 'Cadastro técnico', items: [
    { to: '/setores', label: '🧱 Setores', needsCondo: true },
    { to: '/funcoes', label: '👷 Funções', needsCondo: true },
    { to: '/ghe', label: '🧩 GHE', needsCondo: true },
    { to: '/riscos', label: '⚠️ Inventário de riscos', needsCondo: true },
    { to: '/plano', label: '✅ Plano de ação', needsCondo: true },
  ] },
  { group: 'Documentos', items: [
    { to: '/pgr', label: '📘 PGR / NR-1', needsCondo: true },
    { to: '/drps', label: '🧠 NR-1 / DRPS', needsCondo: true },
    { to: '/pcmso', label: '🩺 PCMSO', needsCondo: true },
    { to: '/ltcat', label: '🏭 LTCAT', needsCondo: true },
    { to: '/laudos', label: '📄 Laudos', needsCondo: true },
  ] },
  { group: 'Sistema', items: [
    { to: '/equipe', label: '🧑‍⚕️ Equipe técnica' },
    { to: '/importar', label: '⬆️ Importar dados V8' },
    { to: '/conta', label: '🔐 Minha conta' },
  ] },
]

const TITLES = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.to, i.label.replace(/^\S+\s/, '')])))

export default function Layout() {
  const { profile, signOut } = useAuth()
  const { condos, condo, setCondoId } = useCondo()
  const loc = useLocation()
  const nav = useNavigate()
  const base = '/' + (loc.pathname.split('/')[1] ?? '')
  const title = TITLES[base] ?? 'Futuro Facilite SST'
  // No celular o menu fica recolhido e fecha ao trocar de tela
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => setMenuOpen(false), [loc.pathname])

  return (
    <div className="app-shell">
      <aside className={'sidebar' + (menuOpen ? ' open' : '')}>
        <div className="brand">
          <img src={import.meta.env.BASE_URL + 'logo.jpeg'} alt="" />
          <div>
            <strong>Futuro Facilite</strong>
            <span>Sistema SST</span>
          </div>
          <button className="menu-toggle" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕ Fechar' : '☰ Menu'}
          </button>
        </div>
        <nav>
          {NAV.map((g) => (
            <div key={g.group} style={{ display: 'contents' }}>
              <div className="nav-group">{g.group}</div>
              {g.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.to === '/'}>{i.label}</NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-user">
          <b>{profile?.nome || profile?.email}</b>
          <span>{profile?.role === 'admin' ? 'Administrador' : 'Técnico'}</span>
          <button onClick={signOut}>Sair</button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            <p>{condo ? condo.nome_fantasia || condo.razao_social : 'Nenhum condomínio selecionado'}</p>
          </div>
          <div className="top-actions">
            <label className="condo-switch">
              Condomínio ativo
              <select value={condo?.id ?? ''} onChange={(e) => setCondoId(e.target.value || null)}>
                {condos.length === 0 && <option value="">— nenhum —</option>}
                {condos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</option>
                ))}
              </select>
            </label>
            <button className="primary" onClick={() => nav('/condominio?novo=1')}>+ Novo condomínio</button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}

export function needsCondo(path: string) {
  return NAV.some((g) => g.items.some((i) => i.to === path && i.needsCondo))
}
