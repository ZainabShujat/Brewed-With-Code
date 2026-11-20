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

// fade the loading screen out once the 3D world has drawn a few frames
{ const boot = document.getElementById('boot')
  if (boot) { const t0 = performance.now(); const chk = () => { const r3f = (window as unknown as { __r3f?: { gl: { info: { render: { frame: number } } } } }).__r3f
    if ((r3f && r3f.gl.info.render.frame > 10) || performance.now() - t0 > 25000) { boot.style.opacity = '0'; setTimeout(() => boot.remove(), 700) } else setTimeout(chk, 200) }; chk() } }
