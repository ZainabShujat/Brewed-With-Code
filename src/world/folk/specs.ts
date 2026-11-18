import type { FaceSpec, EyeStyle, MouthStyle, BrowStyle } from './face'

// Who lives in town: paper folk (notebooks of every kind) and marshmallows. 10 body models × 5 colourways each
// (= 50 + 50), and every single one gets their own face, rolled from a seed so the same townsperson always looks
// the same.

export type FolkKind = 'paper' | 'mallow'
export const PAPER_MODELS = ['classic', 'slim', 'journal', 'spiral', 'open', 'riffled', 'sticky', 'composition', 'pocket', 'diary'] as const
export const MALLOW_MODELS = ['classic', 'tall', 'mini', 'cube', 'twist', 'puck', 'campfire', 'sprinkled', 'dipped', 'swirl'] as const
export type PaperModel = typeof PAPER_MODELS[number]
export type MallowModel = typeof MALLOW_MODELS[number]

// five colourways per kind
export const PAPER_COLOURS = [
  { cover: '#e98fa6', spine: '#c4607e', feet: '#7a3b5a' },  // rose
  { cover: '#8ed1b8', spine: '#5ea88f', feet: '#2f6b5a' },  // mint
  { cover: '#b9a3ea', spine: '#8d72c9', feet: '#4e3a86' },  // lilac
  { cover: '#f2c66a', spine: '#c99a3c', feet: '#7a5a20' },  // butter
  { cover: '#8ab6d6', spine: '#5f8db0', feet: '#2f5574' },  // sky
]
export const MALLOW_COLOURS = [
  { body: '#fffaf6', accent: '#f4d9c8' },  // classic white
  { body: '#ffd6e4', accent: '#f4a9c2' },  // pink
  { body: '#d9f4e6', accent: '#a8dfc4' },  // mint
  { body: '#fff1c4', accent: '#f2d27a' },  // lemon
  { body: '#e8defb', accent: '#c4b0f0' },  // lilac
]

// a tiny seeded random (mulberry32), so a townsperson's face never changes between sessions
export function rng(seed: number) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)]
const between = (r: () => number, lo: number, hi: number) => lo + r() * (hi - lo)

const EYES: EyeStyle[] = ['dot', 'dot', 'oval', 'happy', 'sleepy', 'sparkle', 'wink', 'oval', 'sparkle']
const MOUTHS: MouthStyle[] = ['smile', 'smile', 'grin', 'o', 'cat', 'flat', 'open', 'smile']
const BROWS: BrowStyle[] = ['none', 'none', 'arch', 'flat', 'worried', 'bold', 'arch']

export function rollFace(seed: number, ink = '#2a1830'): FaceSpec {
  const r = rng(seed * 7919 + 13)
  const eyeR = between(r, 0.024, 0.042)
  return {
    gap: between(r, 0.055, 0.115), eyeY: between(r, 0.0, 0.06), eyeR, eye: pick(r, EYES),
    mouthY: between(r, -0.085, -0.035), mouthW: between(r, 0.022, 0.05), mouth: pick(r, MOUTHS),
    brow: pick(r, BROWS), browY: eyeR * between(r, 1.7, 2.4), blush: r() < 0.75 ? between(r, 0.8, 1.4) : 0,
    freckles: r() < 0.18, glasses: r() < 0.14, ink,
  }
}

export type FolkSpec =
  | { kind: 'paper'; model: PaperModel; colour: number; face: FaceSpec; seed: number; ribbon: boolean; sticker: boolean }
  | { kind: 'mallow'; model: MallowModel; colour: number; face: FaceSpec; seed: number; squish: number }

/** townsperson #n of a kind (0..49 = every model × colour; beyond that it wraps with a new face) */
export function folk(kind: FolkKind, n: number): FolkSpec {
  const model = n % 10, colour = Math.floor(n / 10) % 5, seed = n * 31 + (kind === 'paper' ? 1 : 2), r = rng(seed)
  if (kind === 'paper') return { kind, model: PAPER_MODELS[model], colour, seed, face: rollFace(seed), ribbon: r() < 0.5, sticker: r() < 0.35 }
  return { kind, model: MALLOW_MODELS[model], colour, seed, face: rollFace(seed), squish: between(r, 0.9, 1.1) }
}
