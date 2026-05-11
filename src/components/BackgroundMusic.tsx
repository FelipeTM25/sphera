import { useEffect, useRef } from 'react'

// Small procedural "arcade/chiptune" loop using WebAudio.
// Starts on the first user gesture to satisfy browser autoplay policies.

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

export function BackgroundMusic() {
  const ctxRef = useRef<AudioCtx | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const intervalRef = useRef<number | null>(null)

  const startedRef = useRef(false)
  const nextNoteTimeRef = useRef(0)
  const stepRef = useRef(0)

  useEffect(() => {
    const TEMPO = 132
    const secondsPerBeat = 60 / TEMPO

    // 16-step sequencer: each step = 1/4 beat (i.e., 4 steps per beat)
    const stepDur = secondsPerBeat / 4
    const scheduleAhead = 0.12
    const lookaheadMs = 25

    // Patterns (16 steps = 1 bar). Loop is 2 bars (32 steps).
    const leadPattern: Array<number | null> = [
      // Bar 1
      76, null, 79, null, 83, null, 79, null,
      76, null, 79, null, 84, null, 79, null,
      // Bar 2
      74, null, 78, null, 81, null, 78, null,
      74, null, 78, null, 83, null, 78, null,
    ]

    const bassPattern: Array<number | null> = [
      // Bar 1
      40, null, null, null, 40, null, 43, null,
      40, null, null, null, 38, null, 36, null,
      // Bar 2
      38, null, null, null, 38, null, 41, null,
      38, null, null, null, 36, null, 35, null,
    ]

    const kickSteps = new Set([0, 8, 16, 24])

    const ensureRunning = async () => {
      const ctx = ctxRef.current
      if (!ctx) return
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume()
        } catch {
          // ignore
        }
      }
    }

    const start = async () => {
      if (startedRef.current) {
        await ensureRunning()
        return
      }

      const AudioContextCtor = window.AudioContext
      const ctx = new AudioContextCtor({ latencyHint: 'interactive' })
      ctxRef.current = ctx

      const master = ctx.createGain()
      master.gain.setValueAtTime(0.18, ctx.currentTime) // overall volume
      master.connect(ctx.destination)
      masterRef.current = master

      startedRef.current = true
      stepRef.current = 0
      nextNoteTimeRef.current = ctx.currentTime + 0.05

      const scheduler = () => {
        const ctxNow = ctx.currentTime
        while (nextNoteTimeRef.current < ctxNow + scheduleAhead) {
          const step = stepRef.current
          const time = nextNoteTimeRef.current

          const leadMidi = leadPattern[step % leadPattern.length]
          const bassMidi = bassPattern[step % bassPattern.length]

          // Kick
          if (kickSteps.has(step % 32)) {
            scheduleKick({ ctx, out: master, time, gain: 0.25 })
          }

          // Bass
          if (bassMidi != null) {
            scheduleTone({
              ctx,
              out: master,
              time,
              freq: midiToFreq(bassMidi),
              duration: stepDur * 3.0,
              type: 'sawtooth',
              gain: 0.05,
              attack: 0.004,
              release: 0.08,
              detuneCents: -6,
              filterHz: 520,
            })
          }

          // Lead
          if (leadMidi != null) {
            const accent = (step % 8 === 0) ? 1.0 : 0.82
            scheduleTone({
              ctx,
              out: master,
              time,
              freq: midiToFreq(leadMidi),
              duration: stepDur * 1.2,
              type: 'square',
              gain: 0.04 * accent,
              attack: 0.002,
              release: 0.05,
              detuneCents: 7,
              filterHz: 2200,
            })
          }

          // Very subtle "air" noise-ish via high-frequency triangle tick every 2 steps
          if (step % 2 === 0) {
            const g = 0.008 * (0.35 + 0.65 * clamp01(Math.sin(step * 1.7)))
            scheduleTone({
              ctx,
              out: master,
              time,
              freq: 4200,
              duration: stepDur * 0.4,
              type: 'triangle',
              gain: g,
              attack: 0.001,
              release: 0.02,
              filterHz: 5200,
            })
          }

          stepRef.current = (step + 1) % 32
          nextNoteTimeRef.current += stepDur
        }
      }

      intervalRef.current = window.setInterval(scheduler, lookaheadMs)
      await ensureRunning()
    }

    const onFirstGesture = () => {
      void start()
    }

    // Start on first user interaction (autoplay-safe)
    window.addEventListener('pointerdown', onFirstGesture, { once: true })
    window.addEventListener('keydown', onFirstGesture, { once: true })
    window.addEventListener('touchstart', onFirstGesture, { once: true, passive: true } as AddEventListenerOptions)

    const onVisibility = () => {
      if (!ctxRef.current) return
      if (document.visibilityState === 'visible') void ensureRunning()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
      window.removeEventListener('touchstart', onFirstGesture)
      document.removeEventListener('visibilitychange', onVisibility)

      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      masterRef.current?.disconnect()
      masterRef.current = null

      // Close audio context
      const ctx = ctxRef.current
      ctxRef.current = null
      startedRef.current = false
      if (ctx) {
        try {
          void ctx.close()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  return null
}
