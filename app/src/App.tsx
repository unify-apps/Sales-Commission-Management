import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from '@/routes/Login'
import ForgotPassword from '@/routes/ForgotPassword'
import UpdatePassword from '@/routes/UpdatePassword'
import { AppShell } from '@/components/org/app-shell'
import Home from '@/routes/org/Home'
import Profiles from '@/routes/org/Profiles'
import ProfileDetail from '@/routes/org/ProfileDetail'
import Statement from '@/routes/org/Statement'
import Titles from '@/routes/org/Titles'
import People from '@/routes/org/People'
import Positions from '@/routes/org/Positions'
import Hierarchy from '@/routes/org/Hierarchy'
import NamedRelationships from '@/routes/org/NamedRelationships'
import Quotas from '@/routes/plan/Quotas'
import Formulas from '@/routes/plan/Formulas'
import CreateFormula from '@/routes/plan/formula/CreateFormula'
import ReferenceTables from '@/routes/plan/ReferenceTables'
import CreateReferenceTable from '@/routes/plan/reference/CreateReferenceTable'
import Measures from '@/routes/plan/Measures'
import Rules from '@/routes/plan/Rules'
import Plans from '@/routes/plan/Plans'
import Orders from '@/routes/orders/Orders'
import Runs from '@/routes/orders/Runs'
import Results from '@/routes/results/Results'
import Payments from '@/routes/results/Payments'
import Disputes from '@/routes/disputes/Disputes'
import Integration from '@/routes/integration/Integration'
import SimulatorHub from '@/routes/simulator/SimulatorHub'
import RepIncentives from '@/routes/rep/RepIncentives'
import RepPerformance from '@/routes/rep/RepPerformance'
import RepSimulator from '@/routes/rep/RepSimulator'
import Mongoose from '@/routes/Mongoose'

// BrowserRouter (clean URLs, no #). The mount path is never hardcoded here — the engine
// bakes it in as Vite's `base` (VITE_APP_BASE, see vite.config.ts) and the app reads it
// back as BASE_URL, so one value covers every slot it serves. A deploy build bakes '/'
// (the app's domain root → basename normalizes to undefined = root); a preview slot bakes
// its /agent-api/… path. The trailing slash goes because react-router rejects '/a/b'
// against basename '/a/b/'.
const APP_BASE = import.meta.env.BASE_URL
const basename = (APP_BASE.startsWith('/') ? APP_BASE.replace(/\/+$/, '') : '') || undefined

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<AppShell><Home /></AppShell>} />
        <Route path="/organization" element={<Navigate to="/organization/profiles" replace />} />
        <Route path="/organization/profiles" element={<AppShell><Profiles /></AppShell>} />
        <Route path="/organization/profiles/:id" element={<AppShell><ProfileDetail /></AppShell>} />
        <Route path="/organization/profiles/:id/statement" element={<AppShell><Statement /></AppShell>} />
        <Route path="/organization/titles" element={<AppShell><Titles /></AppShell>} />
        <Route path="/organization/people" element={<AppShell><People /></AppShell>} />
        <Route path="/organization/positions" element={<AppShell><Positions /></AppShell>} />
        <Route path="/organization/hierarchy" element={<AppShell><Hierarchy /></AppShell>} />
        <Route path="/organization/named-relationships" element={<AppShell><NamedRelationships /></AppShell>} />
        <Route path="/plan" element={<Navigate to="/plan/plans" replace />} />
        <Route path="/plan/quotas" element={<AppShell><Quotas /></AppShell>} />
        <Route path="/plan/formulas" element={<AppShell><Formulas /></AppShell>} />
        <Route path="/plan/formulas/new" element={<AppShell><CreateFormula /></AppShell>} />
        <Route path="/plan/reference-tables" element={<AppShell><ReferenceTables /></AppShell>} />
        <Route path="/plan/reference-tables/new" element={<AppShell><CreateReferenceTable /></AppShell>} />
        <Route path="/plan/measures" element={<AppShell><Measures /></AppShell>} />
        <Route path="/plan/rules" element={<AppShell><Rules /></AppShell>} />
        <Route path="/plan/plans" element={<AppShell><Plans /></AppShell>} />
        <Route path="/orders" element={<Navigate to="/orders/orders" replace />} />
        <Route path="/orders/orders" element={<AppShell><Orders /></AppShell>} />
        <Route path="/orders/runs" element={<AppShell><Runs /></AppShell>} />
        <Route path="/results" element={<Navigate to="/results/results" replace />} />
        <Route path="/results/results" element={<AppShell><Results /></AppShell>} />
        <Route path="/results/payments" element={<AppShell><Payments /></AppShell>} />
        <Route path="/disputes" element={<AppShell><Disputes /></AppShell>} />
        <Route path="/integration" element={<AppShell><Integration /></AppShell>} />
        <Route path="/simulator" element={<AppShell><SimulatorHub /></AppShell>} />
        <Route path="/rep" element={<Navigate to="/rep/incentives" replace />} />
        <Route path="/rep/incentives" element={<AppShell><RepIncentives /></AppShell>} />
        <Route path="/rep/performance" element={<AppShell><RepPerformance /></AppShell>} />
        <Route path="/rep/graphs" element={<Navigate to="/rep/performance" replace />} />
        <Route path="/rep/simulator" element={<AppShell><RepSimulator /></AppShell>} />
        <Route path="/mongoose" element={<AppShell><Mongoose /></AppShell>} />
        <Route path="/simulator/run" element={<Navigate to="/simulator" replace />} />
        <Route path="/simulator/rules" element={<Navigate to="/simulator?tab=rules" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
