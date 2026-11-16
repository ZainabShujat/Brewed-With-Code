// Tiny synthesised sound kit (Web Audio, no files): grinding, steam hiss, pouring, bell, chimes.
let ctx: AudioContext | null = null
const ac = () => (ctx ??= new AudioContext())

function noise(sec = 2) {
  const a = ac(), b = a.createBuffer(1, a.sampleRate * sec, a.sampleRate), d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

// a looping filtered-noise sound you start and stop (held actions)
export function loop(kind: 'grind' | 'steam' | 'pour' | 'shot') {
  const a = ac(); if (a.state === 'suspended') a.resume()
  const src = a.createBufferSource(); src.buffer = noise(); src.loop = true
  const f = a.createBiquadFilter(), g = a.createGain()
  if (kind === 'grind') { f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8; g.gain.value = 0.18 }
  if (kind === 'steam') { f.type = 'highpass'; f.frequency.value = 3000; g.gain.value = 0.09 }
  if (kind === 'pour') { f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0.22 }
  if (kind === 'shot') { f.type = 'bandpass'; f.frequency.value = 320; f.Q.value = 2; g.gain.value = 0.25 }
  src.connect(f).connect(g).connect(a.destination); src.start()
  // grinder rumble / steam rising pitch
  let lfo: OscillatorNode | null = null
  if (kind === 'grind') { lfo = a.createOscillator(); const lg = a.createGain(); lfo.frequency.value = 38; lg.gain.value = 300; lfo.connect(lg).connect(f.frequency); lfo.start() }
  return {
    set: (k: number) => { if (kind === 'steam') f.frequency.value = 2200 + k * 3000; if (kind === 'pour') f.frequency.value = 400 + k * 900 },
    stop: () => { g.gain.setTargetAtTime(0, a.currentTime, 0.05); setTimeout(() => { src.stop(); lfo?.stop() }, 200) },
  }
}

function tone(freq: number, at: number, dur: number, vol = 0.2, type: OscillatorType = 'sine') {
  const a = ac(), o = a.createOscillator(), g = a.createGain()
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(0, a.currentTime + at); g.gain.linearRampToValueAtTime(vol, a.currentTime + at + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + at + dur)
  o.connect(g).connect(a.destination); o.start(a.currentTime + at); o.stop(a.currentTime + at + dur + 0.05)
}
export const sfx = {
  bell: () => { tone(1568, 0, 1.2, 0.25); tone(2349, 0, 0.9, 0.08) },
  tap: () => tone(660, 0, 0.08, 0.12, 'triangle'),
  good: () => { tone(784, 0, 0.18, 0.15, 'triangle'); tone(1047, 0.08, 0.25, 0.15, 'triangle') },
  perfect: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.35, 0.14, 'triangle')) },
  meh: () => tone(330, 0, 0.25, 0.12, 'triangle'),
  coins: () => { for (let i = 0; i < 5; i++) tone(1800 + i * 120, i * 0.05, 0.12, 0.08, 'square') },
}
