import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { applyTheme, readStoredTheme } from './state/theme'

// Paint in the right theme immediately — before React mounts and long before
// IndexedDB answers.
applyTheme(readStoredTheme())

// Static single-file preview builds (VITE_STATIC_PREVIEW=1) have no server to
// rewrite unknown paths back to index.html, so they route on the hash instead.
// Real deployments use clean paths.
const Router = import.meta.env.VITE_STATIC_PREVIEW ? HashRouter : BrowserRouter

// Served from a subpath on GitHub Pages; '/' everywhere else.
const basename = import.meta.env.VITE_STATIC_PREVIEW ? undefined : import.meta.env.BASE_URL

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router basename={basename}>
      <App />
    </Router>
  </StrictMode>,
)
