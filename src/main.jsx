import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { StoreProvider } from './lib/store.jsx'
import './index.css'

/**
 * Last line of defence. Without it, one render error anywhere unmounts the
 * whole tree and the farmer is left with a blank page and no way back — not
 * even to Profile, where "clear all data" lives. This screen depends on
 * nothing that could itself have failed: no store, no router, no i18n module.
 */
const OOPS = {
  mr: { title: 'काहीतरी चुकलं', body: 'ॲप पुन्हा उघडून पहा. तरीही चाललं नाही तर साठवलेली माहिती पुसा.', reload: 'पुन्हा उघडा', reset: 'माहिती पुसून सुरू करा' },
  hi: { title: 'कुछ गड़बड़ हुई', body: 'ऐप दोबारा खोलकर देखें. फिर भी न चले तो सहेजी जानकारी मिटाएँ.', reload: 'दोबारा खोलें', reset: 'जानकारी मिटाकर शुरू करें' },
  en: { title: 'Something went wrong', body: 'Try reopening the app. If that does not help, clear the saved data.', reload: 'Reopen', reset: 'Clear data and start over' },
}

class Crash extends React.Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error('RITU crashed', error, info?.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    let lang = 'mr'
    try {
      lang = JSON.parse(localStorage.getItem('ritu.v1'))?.lang
    } catch {
      /* unreadable storage is one of the things that may have failed */
    }
    const s = OOPS[lang] || OOPS.mr
    return (
      <div style={{ minHeight: '100vh', background: '#DCD7C9', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 360, background: '#fff', borderRadius: 28, padding: 28, fontFamily: 'system-ui, sans-serif', color: '#1E1A10' }}>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{s.title}</div>
          <p style={{ fontSize: 17, lineHeight: 1.5, marginTop: 10, color: '#4A463C' }}>{s.body}</p>
          <button
            onClick={() => location.assign('/')}
            style={{ marginTop: 18, width: '100%', padding: '16px 0', borderRadius: 22, border: 0, background: '#2E6B3F', color: '#fff', fontSize: 18, fontWeight: 600 }}
          >
            {s.reload}
          </button>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('ritu.v1')
              } catch {
                /* nothing more we can do; the reload still helps */
              }
              location.assign('/')
            }}
            style={{ marginTop: 10, width: '100%', padding: '14px 0', borderRadius: 22, border: '1px solid #C9C3B3', background: 'transparent', color: '#4A463C', fontSize: 16, fontWeight: 600 }}
          >
            {s.reset}
          </button>
        </div>
      </div>
    )
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Crash>
      <BrowserRouter>
        <StoreProvider>
          <App />
        </StoreProvider>
      </BrowserRouter>
    </Crash>
  </React.StrictMode>
)
