import { Navigate, Route, Routes } from 'react-router-dom'
import PhoneFrame from './components/PhoneFrame.jsx'
import { useStore } from './lib/store.jsx'

import Splash from './screens/Splash.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Home from './screens/Home.jsx'
import Crops from './screens/Crops.jsx'
import CropDetail from './screens/CropDetail.jsx'
import Weather from './screens/Weather.jsx'
import Evidence from './screens/Evidence.jsx'
import Profile from './screens/Profile.jsx'
import Ask from './screens/Ask.jsx'
import Diagnose from './screens/Diagnose.jsx'
import Policy from './screens/Policy.jsx'

/** Screens behind onboarding bounce to welcome until the profile exists. */
function Gate({ children }) {
  const { onboarded } = useStore()
  return onboarded ? children : <Navigate to="/" replace />
}

/** The farmer app — everything inside the phone. */
function FarmerApp() {
  return (
    <PhoneFrame>
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
        <Route path="/profile" element={<Gate><Profile /></Gate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PhoneFrame>
  )
}

export default function App() {
  return (
    <Routes>
      {/* the state surface is laptop-sized and sits outside the phone frame */}
      <Route path="/policy" element={<Policy />} />
      <Route path="*" element={<FarmerApp />} />
    </Routes>
  )
}
