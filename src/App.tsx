import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Building2 } from 'lucide-react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import Layout, { needsCondo } from './components/Layout'
import { Loading } from './components/ui'
import { CondoProvider, useCondo } from './state/CondoProvider'
import AgendaPage from './pages/AgendaPage'
import AnterioresPage from './pages/AnterioresPage'
import CondominioPage from './pages/CondominioPage'
import ContaPage from './pages/ContaPage'
import Dashboard from './pages/Dashboard'
import { DrpsPage, LaudosPage, LtcatPage, PcmsoPage, PgrPage, PlanoPage } from './pages/DocPages'
import DrpsForm from './pages/DrpsForm'
import EquipePage from './pages/EquipePage'
import ImportarPage from './pages/ImportarPage'
import { InspecaoForm, InspecaoList } from './pages/InspecaoPage'
import Login from './pages/Login'
import ModeloPage from './pages/ModeloPage'
import { EpisPage, FuncoesPage, GhePage, RiscosPage, SetoresPage } from './pages/TecnicoPages'

/** Bloqueia telas que dependem de um condomínio cadastrado. */
function CondoGate({ children }: { children: ReactNode }) {
  const { condo, loading } = useCondo()
  const loc = useLocation()
  if (loading) return <Loading />
  if (!condo && needsCondo('/' + loc.pathname.split('/')[1])) {
    return (
      <div className="view">
        <div className="module-coming">
          <div className="big-icon"><Building2 size={26} strokeWidth={1.75} aria-hidden="true" /></div>
          <h2>Cadastre um condomínio primeiro</h2>
          <p>Este módulo usa os dados do cadastro central. Comece pelo cadastro do condomínio.</p>
          <Link to="/condominio?novo=1"><button className="primary">Cadastrar condomínio</button></Link>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

function Private() {
  const { loading, session, profile } = useAuth()
  if (loading) return <Loading />
  if (!session) return <Login />
  if (profile && !profile.ativo) {
    return <div className="login-screen"><div className="login-card"><h1>Acesso desativado</h1><p>Fale com o administrador.</p></div></div>
  }
  const g = (el: ReactNode) => <CondoGate>{el}</CondoGate>
  return (
    <CondoProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={g(<Dashboard />)} />
          <Route path="condominio" element={g(<CondominioPage />)} />
          <Route path="agenda" element={g(<AgendaPage />)} />
          <Route path="inspecao" element={g(<InspecaoList />)} />
          <Route path="inspecao/nova" element={g(<InspecaoForm key="nova" />)} />
          <Route path="inspecao/:id" element={g(<InspecaoForm />)} />
          <Route path="modelo" element={g(<ModeloPage />)} />
          <Route path="setores" element={g(<SetoresPage />)} />
          <Route path="funcoes" element={g(<FuncoesPage />)} />
          <Route path="ghe" element={g(<GhePage />)} />
          <Route path="riscos" element={g(<RiscosPage />)} />
          <Route path="epis" element={g(<EpisPage />)} />
          <Route path="plano" element={g(<PlanoPage />)} />
          <Route path="pgr" element={g(<PgrPage />)} />
          <Route path="drps" element={g(<DrpsPage />)} />
          <Route path="pcmso" element={g(<PcmsoPage />)} />
          <Route path="ltcat" element={g(<LtcatPage />)} />
          <Route path="laudos" element={g(<LaudosPage />)} />
          <Route path="anteriores" element={g(<AnterioresPage />)} />
          <Route path="equipe" element={<EquipePage />} />
          <Route path="importar" element={<ImportarPage />} />
          <Route path="conta" element={<ContaPage />} />
          <Route path="*" element={<div className="view"><div className="empty">Página não encontrada.</div></div>} />
        </Route>
      </Routes>
    </CondoProvider>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          {/* Questionário público dos trabalhadores, sem login */}
          <Route path="/drps-form/:token" element={<DrpsForm />} />
          <Route path="*" element={<Private />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
