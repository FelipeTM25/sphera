import { useEffect, useRef } from 'react'
import { useGame } from '../store/gameStore'

// Small procedural "arcade/chiptune" loop using WebAudio.
// The AudioContext is created on the first user gesture (autoplay-safe).
// The sequencer only runs while gameState === 'playing'. On 'gameOver' the
// music halts and a short descending "death" sting is played.

type AudioCtx = AudioContext

function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

function scheduleTone(opts: {
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
  const {
    ctx,
    out,
    time,
    freq,
    duration,
    type,
    gain,
    attack = 0.008,
    release = 0.06,
    detuneCents = 0,
    filterHz,
  } = opts

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

function scheduleKick(opts: { ctx: AudioCtx; out: AudioNode; time: number; gain: number }) {
  const { ctx, out, time, gain } = opts
  const osc = ctx.createOscillator()
  osc.type = 'sine'

  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0.0001, time)
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), time + 0.006)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.18)

  // Pitch drop
  osc.frequency.setValueAtTime(130, time)
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12)

  osc.connect(amp)
  amp.connect(out)

  osc.start(time)
  osc.stop(time + 0.22)
}

// Descending "you died" sting: 3 detuned saw blips falling in pitch + a thud.
function playDeathSound(ctx: AudioCtx, out: AudioNode) {
  const now = ctx.currentTime + 0.01

  // Falling tones
  const notes: Array<[number, number]> = [
    [now + 0.00, 660],
    [now + 0.14, 440],
    [now + 0.30, 280],
  ]
  for (const [time, freq] of notes) {
    scheduleTone({
      ctx, out, time, freq,
      duration: 0.18, type: 'sawtooth',
      gain: 0.22, attack: 0.004, release: 0.12,
      detuneCents: -8, filterHz: 1800,
    })
    scheduleTone({
      ctx, out, time, freq: freq * 0.5,
      duration: 0.22, type: 'square',
      gain: 0.10, attack: 0.004, release: 0.14,
      filterHz: 900,
    })
  }

  // Thud at the end
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

export function BackgroundMusic() {
  const { gameState } = useGame()

  const ctxRef = useRef<AudioCtx | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const musicGainRef = useRef<GainNode | null>(null)
  const intervalRef = useRef<number | null>(null)

  const initializedRef = useRef(false)
  const nextNoteTimeRef = useRef(0)
  const stepRef = useRef(0)

  const prevStateRef = useRef(gameState)

  // ── Init audio graph on first user gesture (autoplay-safe). ─────────────────
  useEffect(() => {
    const initAudio = () => {
      if (initializedRef.current) return
      const AudioContextCtor = window.AudioContext
      if (!AudioContextCtor) return
      const ctx = new AudioContextCtor({ latencyHint: 'interactive' })
      ctxRef.current = ctx

      const master = ctx.createGain()
      master.gain.setValueAtTime(0.22, ctx.currentTime)
      master.connect(ctx.destination)
      masterRef.current = master

      // Separate gain for the music so we can fade it independently of SFX.
      const musicGain = ctx.createGain()
      musicGain.gain.setValueAtTime(0.85, ctx.currentTime)
      musicGain.connect(master)
      musicGainRef.current = musicGain

      initializedRef.current = true
    }

    const onFirstGesture = () => initAudio()

    window.addEventListener('pointerdown', onFirstGesture, { once: true })
    window.addEventListener('keydown', onFirstGesture, { once: true })
    window.addEventListener('touchstart', onFirstGesture, { once: true, passive: true } as AddEventListenerOptions)

    return () => {
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
      window.removeEventListener('touchstart', onFirstGesture)

      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      musicGainRef.current?.disconnect()
      musicGainRef.current = null
      masterRef.current?.disconnect()
      masterRef.current = null

      const ctx = ctxRef.current
      ctxRef.current = null
      initializedRef.current = false
      if (ctx) {
        try { void ctx.close() } catch { /* ignore */ }
      }
    }
  }, [])

  // ── React to gameState: start / stop sequencer + death sound. ───────────────
  useEffect(() => {
    const prev = prevStateRef.current
    prevStateRef.current = gameState

    const TEMPO = 132
    const secondsPerBeat = 60 / TEMPO
    const stepDur = secondsPerBeat / 4
    const scheduleAhead = 0.12
    const lookaheadMs = 25

    const leadPattern: Array<number | null> = [
      76, null, 79, null, 83, null, 79, null,
      76, null, 79, null, 84, null, 79, null,
      74, null, 78, null, 81, null, 78, null,
      74, null, 78, null, 83, null, 78, null,
    ]

    const bassPattern: Array<number | null> = [
      40, null, null, null, 40, null, 43, null,
      40, null, null, null, 38, null, 36, null,
      38, null, null, null, 38, null, 41, null,
      38, null, null, null, 36, null, 35, null,
    ]

    const kickSteps = new Set([0, 8, 16, 24])

    const stopSequencer = () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      const musicGain = musicGainRef.current
      const ctx = ctxRef.current
      if (musicGain && ctx) {
        // Quick fade-out so the cut isn't abrupt.
        const now = ctx.currentTime
        musicGain.gain.cancelScheduledValues(now)
        musicGain.gain.setValueAtTime(musicGain.gain.value, now)
        musicGain.gain.linearRampToValueAtTime(0.0001, now + 0.08)
      }
    }

    const startSequencer = async () => {
      const ctx = ctxRef.current
      const musicGain = musicGainRef.current
      if (!ctx || !musicGain) return

      if (ctx.state === 'suspended') {
        try { await ctx.resume() } catch { /* ignore */ }
      }

      // If a previous sequencer is still running, stop it first.
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      // Fade music back in.
      const now = ctx.currentTime
      musicGain.gain.cancelScheduledValues(now)
      musicGain.gain.setValueAtTime(0.0001, now)
      musicGain.gain.linearRampToValueAtTime(0.85, now + 0.18)

      stepRef.current = 0
      nextNoteTimeRef.current = now + 0.06

      const scheduler = () => {
        const c = ctxRef.current
        const out = musicGainRef.current
        if (!c || !out) return
        const ctxNow = c.currentTime
        while (nextNoteTimeRef.current < ctxNow + scheduleAhead) {
          const step = stepRef.current
          const time = nextNoteTimeRef.current

          const leadMidi = leadPattern[step % leadPattern.length]
          const bassMidi = bassPattern[step % bassPattern.length]

          if (kickSteps.has(step % 32)) {
            scheduleKick({ ctx: c, out, time, gain: 0.25 })
          }

          if (bassMidi != null) {
            scheduleTone({
              ctx: c, out, time,
              freq: midiToFreq(bassMidi),
              duration: stepDur * 3.0,
              type: 'sawtooth',
              gain: 0.05,
              attack: 0.004, release: 0.08,
              detuneCents: -6, filterHz: 520,
            })
          }

          if (leadMidi != null) {
            const accent = (step % 8 === 0) ? 1.0 : 0.82
            scheduleTone({
              ctx: c, out, time,
              freq: midiToFreq(leadMidi),
              duration: stepDur * 1.2,
              type: 'square',
              gain: 0.04 * accent,
              attack: 0.002, release: 0.05,
              detuneCents: 7, filterHz: 2200,
            })
          }

          if (step % 2 === 0) {
            const g = 0.008 * (0.35 + 0.65 * clamp01(Math.sin(step * 1.7)))
            scheduleTone({
              ctx: c, out, time,
              freq: 4200,
              duration: stepDur * 0.4,
              type: 'triangle',
              gain: g,
              attack: 0.001, release: 0.02,
              filterHz: 5200,
            })
          }

          stepRef.current = (step + 1) % 32
          nextNoteTimeRef.current += stepDur
        }
      }

      intervalRef.current = window.setInterval(scheduler, lookaheadMs)
    }

    if (gameState === 'playing') {
      void startSequencer()
    } else {
      stopSequencer()

      // Death sting on transition from 'playing' -> 'gameOver'.
      if (prev === 'playing' && gameState === 'gameOver') {
        const ctx = ctxRef.current
        const master = masterRef.current
        if (ctx && master) {
          if (ctx.state === 'suspended') {
            void ctx.resume().then(() => playDeathSound(ctx, master))
          } else {
            playDeathSound(ctx, master)
          }
        }
      }
    }
  }, [gameState])

  // ── Handle tab visibility: pause/resume context only while playing. ─────────
  useEffect(() => {
    const onVisibility = () => {
      const ctx = ctxRef.current
      if (!ctx) return
      if (document.visibilityState === 'visible' && gameState === 'playing') {
        void ctx.resume()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [gameState])

  return null
}
