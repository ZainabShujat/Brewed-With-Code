import './systems/saves' // first: migrate the old save into slot 1 before any system reads storage
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
// the loading bar: real progress from three.js's loader (models, textures), then 100% once the world draws
import { DefaultLoadingManager } from 'three'
{ const prog = (window as unknown as { __bootProgress?: (p: number) => void }).__bootProgress
  if (prog) DefaultLoadingManager.onProgress = (_u, loaded, total) => prog(0.15 + 0.75 * (loaded / Math.max(1, total))) }
{ const boot = document.getElementById('boot')
  if (boot) { const t0 = performance.now(); const chk = () => { const r3f = (window as unknown as { __r3f?: { gl: { info: { render: { frame: number } } } } }).__r3f
    if ((r3f && r3f.gl.info.render.frame > 10) || performance.now() - t0 > 25000) { (window as unknown as { __bootProgress?: (p: number) => void }).__bootProgress?.(1); setTimeout(() => { boot.style.opacity = '0'; setTimeout(() => boot.remove(), 700) }, 450) } else setTimeout(chk, 200) }; chk() } }

// installable app: register the service worker (built game only; never inside reels / test captures)
if ('serviceWorker' in navigator && (import.meta as unknown as { env: { PROD: boolean } }).env.PROD && !/embed|snap/.test(location.search))
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* not fatal: the game works without it */ }) })
