import { Navigate, Route, Routes } from 'react-router-dom'
import PhoneFrame from './components/PhoneFrame.jsx'
import { useStore } from './lib/store.jsx'

import Welcome from './screens/Welcome.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Home from './screens/Home.jsx'
import Crops from './screens/Crops.jsx'
import CropDetail from './screens/CropDetail.jsx'
import Weather from './screens/Weather.jsx'
import Evidence from './screens/Evidence.jsx'
import Profile from './screens/Profile.jsx'

/** Screens behind onboarding bounce to welcome until the profile exists. */
function Gate({ children }) {
  const { onboarded } = useStore()
  return onboarded ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <PhoneFrame>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/home" element={<Gate><Home /></Gate>} />
        <Route path="/crops" element={<Gate><Crops /></Gate>} />
        <Route path="/crops/:id" element={<Gate><CropDetail /></Gate>} />
        <Route path="/weather" element={<Gate><Weather /></Gate>} />
        <Route path="/evidence" element={<Gate><Evidence /></Gate>} />
        <Route path="/profile" element={<Gate><Profile /></Gate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PhoneFrame>
  )
}
