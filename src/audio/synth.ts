/** Plays SOUNDS through Web Audio. Created lazily on first use (browsers need a user gesture first). */
import { SOUNDS, type SoundName, type ToneSpec } from './sounds'

const MASTER_GAIN = 0.6
const NOISE_SECONDS = 1
const SILENT = 0.0001

export interface Synth {
  readonly play: (name: SoundName) => void
}

const noiseBuffer = (ctx: AudioContext): AudioBuffer => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * NOISE_SECONDS, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

const playTone = (ctx: AudioContext, out: AudioNode, noise: AudioBuffer, tone: ToneSpec) => {
  const start = ctx.currentTime + (tone.delay ?? 0) / 1000
  const end = start + tone.ms / 1000
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(tone.gain, start)
  gain.gain.exponentialRampToValueAtTime(SILENT, end)
  gain.connect(out)
  if (tone.wave === 'noise') {
    const source = ctx.createBufferSource()
    source.buffer = noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(tone.from, start)
    filter.frequency.exponentialRampToValueAtTime(tone.to, end)
    source.connect(filter).connect(gain)
    source.start(start, Math.random() * Math.max(0, NOISE_SECONDS - tone.ms / 1000))
    source.stop(end)
    return
  }
  const osc = ctx.createOscillator()
  osc.type = tone.wave
  osc.frequency.setValueAtTime(tone.from, start)
  osc.frequency.exponentialRampToValueAtTime(tone.to, end)
  osc.connect(gain)
  osc.start(start)
  osc.stop(end)
}

/** A synth that stays silent (and never throws) where Web Audio is missing or blocked. */
export const createSynth = (): Synth => {
  let audio: { ctx: AudioContext; out: AudioNode; noise: AudioBuffer } | null = null
  let broken = false

  const ensure = () => {
    if (audio || broken) return audio
    try {
      const ctx = new AudioContext()
      const out = ctx.createGain()
      out.gain.value = MASTER_GAIN
      out.connect(ctx.destination)
      audio = { ctx, out, noise: noiseBuffer(ctx) }
    } catch (err) {
      console.warn('Sound is unavailable:', err)
      broken = true
    }
    return audio
  }

  return {
    play: (name) => {
      const a = ensure()
      if (!a) return
      if (a.ctx.state === 'suspended') void a.ctx.resume().catch(() => undefined)
      try {
        for (const tone of SOUNDS[name]) playTone(a.ctx, a.out, a.noise, tone)
      } catch (err) {
        console.warn(`Could not play "${name}":`, err)
      }
    },
  }
}
