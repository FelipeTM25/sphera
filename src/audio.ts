// Singleton Web Audio context shared by BackgroundMusic and SFX callers.
// AudioContext is created lazily on the first user gesture (autoplay policy).

type AudioCtx = AudioContext

let _ctx: AudioCtx | null = null
let _master: GainNode | null = null
let _musicGain: GainNode | null = null

export function initAudio() {
  if (_ctx) return
  const Ctor = window.AudioContext
  if (!Ctor) return

  _ctx = new Ctor({ latencyHint: 'interactive' })

  _master = _ctx.createGain()
  _master.gain.setValueAtTime(0.22, _ctx.currentTime)
  _master.connect(_ctx.destination)

  _musicGain = _ctx.createGain()
  _musicGain.gain.setValueAtTime(0.85, _ctx.currentTime)
  _musicGain.connect(_master)
}

export function getAudioCtx(): AudioCtx | null { return _ctx }
export function getMasterGain(): GainNode | null { return _master }
export function getMusicGain(): GainNode | null { return _musicGain }

export async function resumeAudio() {
  if (_ctx && _ctx.state === 'suspended') {
    try { await _ctx.resume() } catch { /* ignore */ }
  }
}

export function closeAudio() {
  _musicGain?.disconnect()
  _musicGain = null
  _master?.disconnect()
  _master = null
  const ctx = _ctx
  _ctx = null
  if (ctx) { try { void ctx.close() } catch { /* ignore */ } }
}

// ── Shared audio helpers ──────────────────────────────────────────────────────

export function scheduleTone(opts: {
  ctx: AudioCtx
  out: AudioNode
  time: number
  freq: number
  duration: number
  type: OscillatorType
  gain: number
  attack?: number
  release?: number
  detuneCents?: number
  filterHz?: number
}) {
  const { ctx, out, time, freq, duration, type, gain,
          attack = 0.008, release = 0.06, detuneCents = 0, filterHz } = opts

  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, time)
  osc.detune.setValueAtTime(detuneCents, time)

  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0.0001, time)
  amp.gain.linearRampToValueAtTime(Math.max(0.0001, gain), time + attack)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(attack + 0.001, duration + release))

  if (filterHz && Number.isFinite(filterHz)) {
    const filt = ctx.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.setValueAtTime(filterHz, time)
    osc.connect(filt)
    filt.connect(amp)
  } else {
    osc.connect(amp)
  }

  amp.connect(out)
  osc.start(time)
  osc.stop(time + duration + release + 0.02)
}

export function scheduleKick(opts: { ctx: AudioCtx; out: AudioNode; time: number; gain: number }) {
  const { ctx, out, time, gain } = opts
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0.0001, time)
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), time + 0.006)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.18)
  osc.frequency.setValueAtTime(130, time)
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12)
  osc.connect(amp)
  amp.connect(out)
  osc.start(time)
  osc.stop(time + 0.22)
}

// ── SFX ──────────────────────────────────────────────────────────────────────

/** 3-note ascending chime played when the player collects a star. */
export function playStarCollect() {
  const ctx = _ctx
  const out = _master
  if (!ctx || !out) return

  const now = ctx.currentTime + 0.01
  const notes = [1047, 1319, 1568] // C6, E6, G6

  notes.forEach((freq, i) => {
    scheduleTone({
      ctx, out,
      time: now + i * 0.07,
      freq,
      duration: 0.12,
      type: 'triangle',
      gain: 0.14,
      attack: 0.004,
      release: 0.10,
      filterHz: 4000,
    })
    // Sub-octave shimmer for warmth
    scheduleTone({
      ctx, out,
      time: now + i * 0.07,
      freq: freq * 0.5,
      duration: 0.10,
      type: 'sine',
      gain: 0.05,
      attack: 0.003,
      release: 0.08,
    })
  })
}

/** Descending sting played on game-over. */
export function playDeathSound() {
  const ctx = _ctx
  const out = _master
  if (!ctx || !out) return

  const now = ctx.currentTime + 0.01
  const notes: Array<[number, number]> = [
    [now + 0.00, 660],
    [now + 0.14, 440],
    [now + 0.30, 280],
  ]
  for (const [time, freq] of notes) {
    scheduleTone({ ctx, out, time, freq, duration: 0.18, type: 'sawtooth', gain: 0.22, attack: 0.004, release: 0.12, detuneCents: -8, filterHz: 1800 })
    scheduleTone({ ctx, out, time, freq: freq * 0.5, duration: 0.22, type: 'square', gain: 0.10, attack: 0.004, release: 0.14, filterHz: 900 })
  }

  const thudTime = now + 0.50
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0.0001, thudTime)
  amp.gain.exponentialRampToValueAtTime(0.35, thudTime + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, thudTime + 0.55)
  osc.frequency.setValueAtTime(120, thudTime)
  osc.frequency.exponentialRampToValueAtTime(28, thudTime + 0.45)
  osc.connect(amp)
  amp.connect(out)
  osc.start(thudTime)
  osc.stop(thudTime + 0.6)
}
