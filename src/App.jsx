import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SaveStatusProvider } from './state/SaveStatus'
import { WeddingProvider, useWedding } from './state/WeddingProvider'
import { useViewportHeight } from './hooks/useViewportHeight'
import { BottomTabBar } from './components/nav/BottomTabBar'
import { UpdateToast } from './components/UpdateToast'
import { RingsIcon } from './components/nav/Icons'

import Onboarding from './screens/Onboarding'
import Dashboard from './screens/Dashboard'
import Budget from './screens/Budget'
import Vendors from './screens/Vendors'
import VendorDetail from './screens/VendorDetail'
import CategoryCompare from './screens/CategoryCompare'
import Payments from './screens/Payments'
import More from './screens/More'
import Settings from './screens/Settings'
import Install from './screens/Install'
import Privacy from './screens/Privacy'
import SharedView from './screens/SharedView'
import Guests from './screens/phase2/Guests'
import Checklist from './screens/phase2/Checklist'
import Seating from './screens/phase2/Seating'
import DayTimeline from './screens/phase2/DayTimeline'
import Moodboard from './screens/phase2/Moodboard'
import WeddingParty from './screens/phase2/WeddingParty'

/** Screens reachable before any wedding exists. */
const PUBLIC_PATHS = ['/onboarding', '/privacy', '/install', '/shared']

function Splash() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-8 text-muted">
      <RingsIcon width={40} height={40} className="text-primary/60" />
      <p className="text-sm">Opening your ledger…</p>
    </div>
  )
}

function Shell() {
  const { loading, hasAnyWedding } = useWedding()
  const location = useLocation()
  const isPublic = PUBLIC_PATHS.includes(location.pathname)

  if (loading && !isPublic) return <Splash />
  // Rendered in place rather than redirected to: a redirect would race the
  // live query that reports the newly created wedding, bouncing a couple who
  // just finished setup back to a blank step one.
  if (!hasAnyWedding && !isPublic) return <Onboarding />

  const showTabs =
    hasAnyWedding && !['/onboarding', '/shared'].includes(location.pathname)

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/vendors/:vendorId" element={<VendorDetail />} />
        <Route path="/categories/:categoryId/compare" element={<CategoryCompare />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/more" element={<More />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/install" element={<Install />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/shared" element={<SharedView />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/guests" element={<Guests />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/seating" element={<Seating />} />
        <Route path="/timeline" element={<DayTimeline />} />
        <Route path="/moodboard" element={<Moodboard />} />
        <Route path="/party" element={<WeddingParty />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showTabs && <BottomTabBar />}
      <UpdateToast />
    </>
  )
}

export default function App() {
  useViewportHeight()

  return (
    <SaveStatusProvider>
      <WeddingProvider>
        <Shell />
      </WeddingProvider>
    </SaveStatusProvider>
  )
}
