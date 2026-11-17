import { Component, type ReactNode } from 'react'

// Crash safety: any error is recorded in window.__errors (the automated play-through fails on it), and a
// crash while drawing shows a friendly card with Reload instead of a blank screen. Saves live in
// localStorage and are written as you play, so reloading keeps your progress.
type Win = Window & { __errors?: string[] }
const log = (msg: string) => { const w = window as Win; (w.__errors ||= []).push(msg); console.error('[game error]', msg) }
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => log(`${e.message} @ ${e.filename}:${e.lineno}`))
  window.addEventListener('unhandledrejection', (e) => log(`unhandled promise: ${String(e.reason)}`))
}

export class CrashGuard extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null }
  static getDerivedStateFromError(e: unknown) { return { err: e instanceof Error ? e.message : String(e) } }
  componentDidCatch(e: unknown) { log(`crash: ${e instanceof Error ? e.stack ?? e.message : String(e)}`) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="crash">
        <div className="card">
          <div className="h">Oops, the café tripped over ☕</div>
          <p>Something went wrong. Your coins and days are saved.</p>
          <button className="brew-go" onClick={() => location.reload()}>Reload the café</button>
          <small>{this.state.err}</small>
        </div>
      </div>
    )
  }
}
