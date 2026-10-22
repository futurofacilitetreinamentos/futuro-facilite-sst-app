import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen, Brain, Building2, CalendarDays, ClipboardCheck, Factory, FileSignature, FileText, GraduationCap, HardHat,
  HeartPulse, History, House, IdCard, KeyRound, Send,
  Layers, ListChecks, LogOut, Menu, Plus, ShieldCheck, Sparkles, Stethoscope, TriangleAlert, Upload, UserRound, Users, X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useCondo } from '../state/CondoProvider'

type NavItem = { to: string; label: string; icon: LucideIcon; needsCondo?: boolean }

export const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Atendimento', items: [
    { to: '/', label: 'Atendimento', icon: House },
    { to: '/condominio', label: 'Condomínio', icon: Building2 },
    { to: '/agenda', label: 'Agenda', icon: CalendarDays, needsCondo: true },
    { to: '/inspecao', label: 'Inspeção SST', icon: ClipboardCheck, needsCondo: true },
  ] },
  { group: 'Cadastro técnico', items: [
    { to: '/modelo', label: 'Montar pelo modelo', icon: Sparkles, needsCondo: true },
    { to: '/setores', label: 'Setores', icon: Layers, needsCondo: true },
    { to: '/funcoes', label: 'Funções', icon: HardHat, needsCondo: true },
    { to: '/ghe', label: 'GHE', icon: Users, needsCondo: true },
    { to: '/riscos', label: 'Inventário de riscos', icon: TriangleAlert, needsCondo: true },
    { to: '/epis', label: 'EPIs', icon: ShieldCheck, needsCondo: true },
    { to: '/plano', label: 'Plano de ação', icon: ListChecks, needsCondo: true },
  ] },
  { group: 'Trabalhadores', items: [
    { to: '/trabalhadores', label: 'Trabalhadores', icon: IdCard, needsCondo: true },
    { to: '/asos', label: 'ASOs', icon: HeartPulse, needsCondo: true },
    { to: '/treinamentos', label: 'Treinamentos', icon: GraduationCap, needsCondo: true },
  ] },
  { group: 'Documentos', items: [
    { to: '/pgr', label: 'PGR / NR-1', icon: BookOpen, needsCondo: true },
    { to: '/drps', label: 'NR-1 / DRPS', icon: Brain, needsCondo: true },
    { to: '/pcmso', label: 'PCMSO', icon: Stethoscope, needsCondo: true },
    { to: '/ltcat', label: 'LTCAT', icon: Factory, needsCondo: true },
    { to: '/laudos', label: 'Laudos', icon: FileText, needsCondo: true },
    { to: '/ordem-servico', label: 'Ordem de Serviço', icon: FileSignature, needsCondo: true },
    { to: '/esocial', label: 'eSocial', icon: Send, needsCondo: true },
    { to: '/anteriores', label: 'Laudos anteriores', icon: History, needsCondo: true },
  ] },
  { group: 'Sistema', items: [
    { to: '/equipe', label: 'Equipe técnica', icon: UserRound },
    { to: '/importar', label: 'Importar dados V8', icon: Upload },
    { to: '/conta', label: 'Minha conta', icon: KeyRound },
  ] },
]

const TITLES = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.to, i.label])))

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
}

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
  const userName = profile?.nome || profile?.email || ''

  return (
    <div className="app-shell">
      <aside className={'sidebar' + (menuOpen ? ' open' : '')}>
        <div className="brand">
          <img src={import.meta.env.BASE_URL + 'logo.jpeg'} alt="" />
          <div>
            <strong>Futuro Facilite</strong>
            <span>Sistema SST</span>
          </div>
          <button className="menu-toggle" aria-expanded={menuOpen} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <nav>
          {NAV.map((g) => (
            <div key={g.group} style={{ display: 'contents' }}>
              <div className="nav-group">{g.group}</div>
              {g.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.to === '/'}>
                  <i.icon size={17} strokeWidth={1.75} aria-hidden="true" />
                  <span>{i.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-user">
          <div className="avatar" aria-hidden="true">{initials(userName)}</div>
          <div className="side-user-info">
            <b>{userName}</b>
            <span>{profile?.role === 'admin' ? 'Administrador' : 'Técnico'}</span>
          </div>
          <button className="icon-btn" onClick={signOut} aria-label="Sair" title="Sair"><LogOut size={17} strokeWidth={1.75} /></button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
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
            <button className="primary" onClick={() => nav('/condominio?novo=1')}>
              <Plus size={16} strokeWidth={2} aria-hidden="true" /> Novo condomínio
            </button>
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
