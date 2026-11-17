import { create } from 'zustand'

// Café radio: CC-BY jazz by Kevin MacLeod (incompetech.com), credited on the credits screen.
// The player picks a track (or "shuffle all"), sets the volume, or turns it off; the choice is saved.
export const TRACKS = [
  { id: 'jazz-brunch', title: 'Jazz Brunch' },
  { id: 'bossa-antigua', title: 'Bossa Antigua' },
  { id: 'backbay-lounge', title: 'Backbay Lounge' },
  { id: 'cool-vibes', title: 'Cool Vibes' },
  { id: 'sidewalk-shade', title: 'Sidewalk Shade' },
  { id: 'long-stroll', title: 'Long Stroll' },
  { id: 'casa-bossa-nova', title: 'Casa Bossa Nova' },
  { id: 'george-street-shuffle', title: 'George Street Shuffle' },
] as const

const BASE = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL
const KEY = 'brewed-with-code-music-v1'
type Saved = { track: string; volume: number; on: boolean }
const load = (): Saved => { try { return { track: 'shuffle', volume: 0.35, on: true, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { track: 'shuffle', volume: 0.35, on: true } } }

let audio: HTMLAudioElement | null = null
let shuffleIdx = Math.floor(Math.random() * TRACKS.length)

type Music = Saved & { playing: string; start: () => void; setTrack: (t: string) => void; setVolume: (v: number) => void; toggle: () => void }

export const useMusic = create<Music>((set, get) => {
  const play = (id: string) => {
    if (typeof window === 'undefined') return
    if (!audio) { audio = new Audio(); audio.addEventListener('ended', () => { if (get().track === 'shuffle') { shuffleIdx = (shuffleIdx + 1) % TRACKS.length; play(TRACKS[shuffleIdx].id) } }) }
    audio.src = `${BASE}assets/music/${id}.mp3`; audio.loop = get().track !== 'shuffle'; audio.volume = get().volume
    audio.play().catch(() => { /* blocked until the player clicks; start() is called again on the next click */ })
    set({ playing: id })
  }
  const save = () => { const { track, volume, on } = get(); try { localStorage.setItem(KEY, JSON.stringify({ track, volume, on })) } catch { /* private mode */ } }
  return {
    ...load(), playing: '',
    start: () => { const s = get(); if (!s.on || (audio && !audio.paused)) return; play(s.track === 'shuffle' ? TRACKS[shuffleIdx].id : s.track) },
    setTrack: (t) => { set({ track: t, on: true }); save(); play(t === 'shuffle' ? TRACKS[shuffleIdx].id : t) },
    setVolume: (v) => { set({ volume: v }); if (audio) audio.volume = v; save() },
    toggle: () => { const on = !get().on; set({ on }); save(); if (!on) audio?.pause(); else get().start() },
  }
})
