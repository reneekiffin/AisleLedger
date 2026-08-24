import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { applyTheme, readStoredTheme } from './state/theme'

// Paint in the right theme immediately — before React mounts and long before
// IndexedDB answers.
applyTheme(readStoredTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
