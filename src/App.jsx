import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PhoneFrame from './components/PhoneFrame.jsx'
import { useStore } from './lib/store.jsx'

// The first screens a farmer sees load with the app; the rest load when first
// opened. On 2G that is the difference between the home screen appearing and
// waiting for the state map and the evidence charts nobody has asked for yet.
// The service worker still caches every screen, so all of them work offline.
import Splash from './screens/Splash.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Home from './screens/Home.jsx'
const Crops = lazy(() => import('./screens/Crops.jsx'))
const CropDetail = lazy(() => import('./screens/CropDetail.jsx'))
const Weather = lazy(() => import('./screens/Weather.jsx'))
const Evidence = lazy(() => import('./screens/Evidence.jsx'))
const Profile = lazy(() => import('./screens/Profile.jsx'))
const Ask = lazy(() => import('./screens/Ask.jsx'))
const Diagnose = lazy(() => import('./screens/Diagnose.jsx'))
const Compare = lazy(() => import('./screens/Compare.jsx'))
const Soil = lazy(() => import('./screens/Soil.jsx'))
const Policy = lazy(() => import('./screens/Policy.jsx'))

/** Screens behind onboarding bounce to welcome until the profile exists. */
function Gate({ children }) {
  const { onboarded } = useStore()
  return onboarded ? children : <Navigate to="/" replace />
}

/** The farmer app — everything inside the phone. */
function FarmerApp() {
  return (
    <PhoneFrame>
      {/* the frame stays put while a screen's code arrives */}
      <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/home" element={<Gate><Home /></Gate>} />
        <Route path="/crops" element={<Gate><Crops /></Gate>} />
        <Route path="/crops/:id" element={<Gate><CropDetail /></Gate>} />
        <Route path="/weather" element={<Gate><Weather /></Gate>} />
        <Route path="/evidence" element={<Gate><Evidence /></Gate>} />
        <Route path="/ask" element={<Gate><Ask /></Gate>} />
        <Route path="/diagnose" element={<Gate><Diagnose /></Gate>} />
        <Route path="/compare" element={<Gate><Compare /></Gate>} />
        <Route path="/soil" element={<Gate><Soil /></Gate>} />
        <Route path="/profile" element={<Gate><Profile /></Gate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </PhoneFrame>
  )
}

export default function App() {
  return (
    <Routes>
      {/* the state surface is laptop-sized and sits outside the phone frame */}
      <Route path="/policy" element={<Suspense fallback={null}><Policy /></Suspense>} />
      <Route path="*" element={<FarmerApp />} />
    </Routes>
  )
}
