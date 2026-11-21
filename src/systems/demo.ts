import { create } from 'zustand'
import { useGame } from './store'
import { useDay } from './day'
import { useShop } from './shop'
import { useKitchen, target } from './kitchen'
import { useCake } from './cake'
import { useTodayMenu } from './todaymenu'
import { view } from './CameraRig'
import { cafe } from '../world/Customers'
import { machine } from '../world/CakeMachine'
import { lock } from './saves'

// "Watch a demo" (21 Nov): the real game plays a whole café day by itself in ~70 s, with a caption for each step,
// so a new player sees exactly what to do. It never touches the save: the S0 write lock blocks every progress write
// while it runs, and the page reloads at the end (or on Skip), so the café is exactly as the player left it.
type Demo = { on: boolean; step: number; total: number; caption: string; sub: string; start: () => void; stop: () => void }
const STEPS = 8
export const useDemo = create<Demo>((set) => ({
  on: false, step: 0, total: STEPS, caption: '', sub: '',
  start: () => { set({ on: true, step: 0 }); void run() },
  stop: () => { set({ on: false }); try { location.reload() } catch { /* tests */ } },
}))
const say = (step: number, caption: string, sub = '') => useDemo.setState({ step, caption, sub })
// Counts RENDERED time (each frame's delta capped at 0.1 s), so a mode switch that freezes the page while shaders
// compile doesn't eat the step: every caption stays on screen for its full length.
const wait = (s: number) => new Promise<void>((res, rej) => {
  let left = s * 1000, last = performance.now()
  const tick = () => {
    if (!useDemo.getState().on) return rej(new Error('stopped'))
    const now = performance.now(); left -= Math.min(100, now - last); last = now
    if (left <= 0) return res()
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})
const until = async (f: () => boolean, max = 20) => { const t0 = performance.now(); while (!f() && performance.now() - t0 < max * 1000) await wait(0.1) }
const mode = (m: Parameters<ReturnType<typeof useGame.getState>['setMode']>[0]) => useGame.getState().setMode(m)
const cam = (v: Partial<typeof view>) => setTimeout(() => Object.assign(view, v), 220) // after the mode switch settles

async function run() {
  lock.on = true // nothing the demo does is saved
  try {
    // 1 · the café
    useDay.setState({ phase: 'idle', day: 8 }); useGame.getState().setMode('dollhouse'); cam({ zoom: 0.55, yaw: -0.3 })
    say(1, 'This is your café, inside a giant teapot', 'you run all of it: the coffee bar, the kitchen and the cake bench')
    await wait(4)
    // 2 · today's menu
    say(2, 'Each morning, pick today’s menu', 'customers only order what you choose to sell')
    useTodayMenu.getState().setIds(['latte', 'cappuccino', 'mocha', 'cake-vanilla']); useTodayMenu.getState().ask(() => {})
    await wait(3.5); useTodayMenu.getState().confirm(8)
    // 3 · open up
    say(3, 'Flip the sign to OPEN, and the town comes in', 'marshmallows from the west, notebooks from the east')
    mode('walk'); Object.assign(useGame.getState().player, { x: 0, z: 9, facing: 0 }); cam({ yaw: 0, pitch: 0.1, zoom: 0.9 })
    useShop.getState().openShop(true); useDay.getState().start(); cafe.reset(); cafe.seed(3); cafe.fill(1)
    await wait(2.5); await until(() => { const f = cafe.line.peek(); return !!(f && f.phase === 'line' && useShop.getState().orders[f.id]) }, 10)
    { const f = cafe.line.peek(); const o = f && useShop.getState().orders[f.id]; if (o) { o.cake = false; Object.assign(o.want, { size: 'medium', shots: 2, milk: 'steamed', milkType: 'whole', chocolate: false, water: false, topping: 'none' }); o.label = 'Medium Latte' } }
    await wait(1)
    // 4 · brew by hand
    say(4, 'Take the order, then brew it by hand', 'a glass, two espresso shots, steamed milk')
    mode('pov'); await wait(1.5)
    const S = () => useShop.getState()
    S().takeCup('medium'); await wait(1.2); S().shot(); await wait(1.4); S().shot(); await wait(1.6); S().milk('steamed'); await wait(2.4)
    say(4, 'Serve it, and they sit down to sip and gossip', 'happy customers leave coins and tips'); S().serve(); await wait(3)
    // 5 · the kitchen
    say(5, 'Cakes start in the kitchen, behind the pink curtains', 'hold to pour onto the scale, tap to crack and cut')
    const K = () => useKitchen.getState(); K().tip(); K().choose('vanilla'); mode('kitchen'); await wait(1.2)
    for (const p of ['flour', 'sugar'] as const) { K().startPour(p); await until(() => K().poured[p] >= target('vanilla', p), 6); K().stopPour(); await wait(1) }
    for (const p of ['eggs', 'eggs', 'eggs', 'butter', 'butter', 'butter'] as const) { useKitchen.setState({ pour: null }); K().add(p); await wait(0.95) }
    say(5, 'Whisk it smooth: that’s batter for three layers', ''); K().setStirring(true); await wait(3); K().setStirring(false)
    // 6 · the cake bench
    say(6, 'Then bake and decorate it at the cake bench', 'press the picture buttons under each machine, in order')
    mode('cake'); useCake.getState().reset(); useKitchen.setState({ batter: { vanilla: 6, chocolate: 6, strawberry: 6 } })
    { const o = useCake.getState().order; o.want = { ...o.want, layers: o.want.layers.map(() => 'vanilla' as const) } } useCake.setState({ orderUntil: performance.now() + 2500 }); await wait(1.5)
    const C = () => useCake.getState(), w = C().order.want
    const press = async (at: Parameters<typeof machine.choose>[0], fn: () => void) => { await until(() => !machine.busy, 15); machine.choose(at, fn); await wait(0.3) }
    await press('tin', () => C().setTin(w.tin === 'none' ? 'round' : w.tin))
    for (let i = 0; i < w.layers.length; i++) { await press('layer', () => C().addLayer(w.layers[i])); if (i < w.layers.length - 1) await press('fill', () => C().addFilling(w.fillings[i] ?? 'cream')) }
    if (w.frosting !== 'none') await press('frost', () => C().frost(w.frosting as Exclude<typeof w.frosting, 'none'>))
    if (w.piping !== 'none') await press('pipe', () => C().pipe(w.piping as Exclude<typeof w.piping, 'none'>))
    if (w.top !== 'none') await press('top', () => C().topWith(w.top as Exclude<typeof w.top, 'none'>))
    await until(() => !machine.busy, 40); await wait(1)
    say(6, 'Roll it to the star to box it up', ''); for (let i = 0; i < 8 && machine.idx < 7; i++) { machine.step(1); await wait(0.5) } await wait(2.5)
    // 7 · the town
    say(7, 'Step outside: shops, neighbours and the park', 'buy beans, milk and flour in town when you run low')
    mode('exterior'); cam({ yaw: 0.3, pitch: 0.35, zoom: 1.0 }); await wait(4)
    // 8 · close up
    say(8, 'At 8 pm, flip the sign and see how your day went', 'your turn! open your own café')
    try { (window as unknown as { __clock: { set: (h: number) => void } }).__clock.set(20.6) } catch { /* no clock hook */ }
    cam({ yaw: 0.1, zoom: 0.9 }); await wait(4.5)
  } catch { /* skipped */ }
  useDemo.getState().stop()
}
if (typeof window !== 'undefined') (window as unknown as { __demo: typeof useDemo }).__demo = useDemo
