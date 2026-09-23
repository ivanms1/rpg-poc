/** Every sound is a few synthesized tones: no audio files to load. */

export interface ToneSpec {
  /** Oscillator shape, or filtered white noise (`from`/`to` are then the low-pass cutoff in Hz). */
  readonly wave: 'sine' | 'square' | 'triangle' | 'sawtooth' | 'noise'
  /** Start and end frequency in Hz (swept exponentially). */
  readonly from: number
  readonly to: number
  readonly ms: number
  /** Peak volume, 0–1; decays to silence over `ms`. */
  readonly gain: number
  readonly delay?: number
}

export const SOUNDS = {
  step: [{ wave: 'noise', from: 900, to: 300, ms: 40, gain: 0.05 }],
  open: [{ wave: 'triangle', from: 520, to: 780, ms: 90, gain: 0.12 }],
  pickup: [
    { wave: 'square', from: 660, to: 660, ms: 60, gain: 0.07 },
    { wave: 'square', from: 990, to: 990, ms: 90, gain: 0.07, delay: 60 },
  ],
  coin: [
    { wave: 'square', from: 988, to: 988, ms: 50, gain: 0.06 },
    { wave: 'square', from: 1319, to: 1319, ms: 120, gain: 0.06, delay: 50 },
  ],
  spend: [
    { wave: 'triangle', from: 1319, to: 988, ms: 70, gain: 0.1 },
    { wave: 'triangle', from: 740, to: 740, ms: 90, gain: 0.08, delay: 60 },
  ],
  night: [
    { wave: 'sine', from: 330, to: 320, ms: 900, gain: 0.12 },
    { wave: 'sine', from: 165, to: 160, ms: 1100, gain: 0.08, delay: 120 },
  ],
  /** A rising shimmer while the fog lifts (Lookout Tower, Crystal Ball). */
  reveal: [
    { wave: 'noise', from: 7000, to: 2500, ms: 900, gain: 0.03 },
    { wave: 'triangle', from: 523, to: 523, ms: 420, gain: 0.08 },
    { wave: 'triangle', from: 659, to: 659, ms: 420, gain: 0.08, delay: 130 },
    { wave: 'triangle', from: 784, to: 784, ms: 420, gain: 0.08, delay: 260 },
    { wave: 'triangle', from: 1047, to: 1047, ms: 520, gain: 0.08, delay: 390 },
    { wave: 'sine', from: 1568, to: 1568, ms: 1000, gain: 0.05, delay: 520 },
    { wave: 'sine', from: 2093, to: 2093, ms: 900, gain: 0.03, delay: 650 },
  ],
  encounter: [
    { wave: 'noise', from: 3000, to: 600, ms: 160, gain: 0.12 },
    { wave: 'square', from: 110, to: 220, ms: 180, gain: 0.07 },
  ],
  boss: [
    { wave: 'sawtooth', from: 55, to: 41, ms: 1200, gain: 0.14 },
    { wave: 'noise', from: 400, to: 80, ms: 900, gain: 0.12 },
    { wave: 'sawtooth', from: 82, to: 62, ms: 1000, gain: 0.07, delay: 200 },
  ],
  strike: [{ wave: 'noise', from: 5000, to: 1200, ms: 60, gain: 0.08 }],
  hit: [
    { wave: 'noise', from: 1400, to: 200, ms: 110, gain: 0.18 },
    { wave: 'square', from: 120, to: 50, ms: 110, gain: 0.08 },
  ],
  armor: [{ wave: 'triangle', from: 1800, to: 1200, ms: 80, gain: 0.1 }],
  heal: [{ wave: 'sine', from: 440, to: 880, ms: 160, gain: 0.12 }],
  status: [{ wave: 'triangle', from: 300, to: 520, ms: 100, gain: 0.1 }],
  death: [
    { wave: 'sawtooth', from: 220, to: 40, ms: 520, gain: 0.12 },
    { wave: 'noise', from: 800, to: 100, ms: 400, gain: 0.1 },
  ],
  victory: [
    { wave: 'square', from: 523, to: 523, ms: 110, gain: 0.07 },
    { wave: 'square', from: 659, to: 659, ms: 110, gain: 0.07, delay: 110 },
    { wave: 'square', from: 784, to: 784, ms: 110, gain: 0.07, delay: 220 },
    { wave: 'square', from: 1047, to: 1047, ms: 320, gain: 0.07, delay: 330 },
  ],
  defeat: [
    { wave: 'triangle', from: 392, to: 392, ms: 220, gain: 0.12 },
    { wave: 'triangle', from: 330, to: 330, ms: 220, gain: 0.12, delay: 220 },
    { wave: 'triangle', from: 262, to: 196, ms: 700, gain: 0.12, delay: 440 },
  ],
} as const satisfies Record<string, readonly ToneSpec[]>

export type SoundName = keyof typeof SOUNDS
