import { useEffect, useRef } from 'react'
import { useGame } from '../store/gameStore'
import {
  initAudio,
  getAudioCtx,
  getMusicGain,
  resumeAudio,
  closeAudio,
  playDeathSound,
  scheduleTone,
  scheduleKick,
} from '../audio'

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function BackgroundMusic() {
  const { gameState } = useGame()
  const intervalRef = useRef<number | null>(null)
  const nextNoteTimeRef = useRef(0)
  const stepRef = useRef(0)
  const prevStateRef = useRef(gameState)

  // Init AudioContext on first user gesture (autoplay policy)
  useEffect(() => {
    const onGesture = () => initAudio()
    window.addEventListener('pointerdown', onGesture, { once: true })
    window.addEventListener('keydown', onGesture, { once: true })
    window.addEventListener('touchstart', onGesture, { once: true, passive: true } as AddEventListenerOptions)
    return () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
      window.removeEventListener('touchstart', onGesture)
      if (intervalRef.current != null) window.clearInterval(intervalRef.current)
      closeAudio()
    }
  }, [])

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
      const musicGain = getMusicGain()
      const ctx = getAudioCtx()
      if (musicGain && ctx) {
        const now = ctx.currentTime
        musicGain.gain.cancelScheduledValues(now)
        musicGain.gain.setValueAtTime(musicGain.gain.value, now)
        musicGain.gain.linearRampToValueAtTime(0.0001, now + 0.08)
      }
    }

    const startSequencer = async () => {
      const ctx = getAudioCtx()
      const musicGain = getMusicGain()
      if (!ctx || !musicGain) return

      await resumeAudio()

      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      const now = ctx.currentTime
      musicGain.gain.cancelScheduledValues(now)
      musicGain.gain.setValueAtTime(0.0001, now)
      musicGain.gain.linearRampToValueAtTime(0.85, now + 0.18)

      stepRef.current = 0
      nextNoteTimeRef.current = now + 0.06

      const scheduler = () => {
        const c = getAudioCtx()
        const out = getMusicGain()
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
            scheduleTone({ ctx: c, out, time, freq: midiToFreq(bassMidi), duration: stepDur * 3.0, type: 'sawtooth', gain: 0.05, attack: 0.004, release: 0.08, detuneCents: -6, filterHz: 520 })
          }

          if (leadMidi != null) {
            const accent = (step % 8 === 0) ? 1.0 : 0.82
            scheduleTone({ ctx: c, out, time, freq: midiToFreq(leadMidi), duration: stepDur * 1.2, type: 'square', gain: 0.04 * accent, attack: 0.002, release: 0.05, detuneCents: 7, filterHz: 2200 })
          }

          if (step % 2 === 0) {
            const g = 0.008 * (0.35 + 0.65 * clamp01(Math.sin(step * 1.7)))
            scheduleTone({ ctx: c, out, time, freq: 4200, duration: stepDur * 0.4, type: 'triangle', gain: g, attack: 0.001, release: 0.02, filterHz: 5200 })
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

      if (prev === 'playing' && gameState === 'gameOver') {
        const ctx = getAudioCtx()
        if (ctx) {
          if (ctx.state === 'suspended') {
            void ctx.resume().then(() => playDeathSound())
          } else {
            playDeathSound()
          }
        }
      }
    }
  }, [gameState])

  // Pause/resume on tab visibility change
  useEffect(() => {
    const onVisibility = () => {
      if (gameState === 'playing') void resumeAudio()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [gameState])

  return null
}
