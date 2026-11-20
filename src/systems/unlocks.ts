import { useDay } from './day'

// Progressive areas (playtest brief, 20 Nov): each area unlocks by its own rule (a café milestone, a story event, or
// discovering something). Locked areas say WHY they're closed and what opens them (a sign at their gate), never an
// invisible wall. Configure per area here; isOpen() is the one question the world asks.
export type Rule = { kind: 'day'; day: number } | { kind: 'discover'; place: string } | { kind: 'story'; flag: string } | { kind: 'later' }
export type Area = { id: string; name: string; icon: string; rule: Rule }
export const AREAS: Area[] = [
  // the two towns aren't walkable yet (their streets are scenery for now): honest signs, no fake gates
  { id: 'hollow', name: 'Marshmallow Hollow', icon: '🍡', rule: { kind: 'later' } },
  { id: 'notebook', name: 'Notebook Row', icon: '📓', rule: { kind: 'later' } },
]
const flags = new Set<string>() // story flags (set by story events when they exist)
const found = new Set<string>()  // discovered places (the explore-first checklist will feed this)
export const discover = (place: string) => found.add(place)
export const setFlag = (f: string) => flags.add(f)
export function isOpen(id: string) {
  const a = AREAS.find((x) => x.id === id); if (!a) return true
  const r = a.rule
  if (r.kind === 'day') return useDay.getState().day >= r.day
  if (r.kind === 'discover') return found.has(r.place)
  if (r.kind === 'story') return flags.has(r.flag)
  return false
}
/** what the sign at a locked area says */
export function whyClosed(id: string) {
  const a = AREAS.find((x) => x.id === id); if (!a) return ''
  const r = a.rule
  return r.kind === 'day' ? `opens on day ${r.day}` : r.kind === 'discover' ? 'find the way in…' : r.kind === 'story' ? 'opens later in the story' : 'opening in a future update 🏗️'
}
