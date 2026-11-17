import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { CrashGuard } from './ui/Crash'
import './ui/style.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CrashGuard>
      <App />
    </CrashGuard>
  </React.StrictMode>,
)
