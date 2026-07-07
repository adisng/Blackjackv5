'use client'

/**
 * Procedural sound engine using the Web Audio API.
 * No external audio files — all tones are synthesized.
 *
 * Two buses:
 *  - SFX bus  → compressor → destination (punchy, satisfying one-shots)
 *  - Music bus → lowpass → destination (low-volume ambient loop)
 */

type SoundName =
  | 'deal'
  | 'chip'
  | 'win'
  | 'lose'
  | 'blackjack'
  | 'flip'
  | 'click'
  | 'stand'
  | 'push'

let ctx: AudioContext | null = null
let muted = false
let musicMuted = false

let sfxBus: GainNode | null = null
let musicBus: GainNode | null = null

const MUSIC_VOLUME = 0.045

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function getSfxBus(ac: AudioContext): GainNode {
  if (!sfxBus) {
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.knee.value = 12
    comp.ratio.value = 6
    comp.attack.value = 0.002
    comp.release.value = 0.12
    sfxBus = ac.createGain()
    sfxBus.gain.value = 1
    sfxBus.connect(comp)
    comp.connect(ac.destination)
  }
  return sfxBus
}

export function setMuted(value: boolean) {
  muted = value
}

export function setMusicMuted(value: boolean) {
  musicMuted = value
  const ac = ctx
  if (musicBus && ac) {
    musicBus.gain.cancelScheduledValues(ac.currentTime)
    musicBus.gain.linearRampToValueAtTime(value ? 0 : MUSIC_VOLUME, ac.currentTime + 0.8)
  }
}

/** Small random detune so repeated sounds never feel robotic. */
function vary(freq: number, cents = 30): number {
  return freq * Math.pow(2, ((Math.random() * 2 - 1) * cents) / 1200)
}

function tone(
  ac: AudioContext,
  {
    freq,
    type = 'sine',
    start = 0,
    duration = 0.15,
    gain = 0.08,
    endFreq,
    attack = 0.01,
    dest,
  }: {
    freq: number
    type?: OscillatorType
    start?: number
    duration?: number
    gain?: number
    endFreq?: number
    attack?: number
    dest?: AudioNode
  },
) {
  const t0 = ac.currentTime + start
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g).connect(dest ?? getSfxBus(ac))
  osc.start(t0)
  osc.stop(t0 + duration + 0.05)
}

function noiseBurst(
  ac: AudioContext,
  {
    start = 0,
    duration = 0.08,
    gain = 0.05,
    highpass = 2000,
    lowpass,
    dest,
  }: {
    start?: number
    duration?: number
    gain?: number
    highpass?: number
    lowpass?: number
    dest?: AudioNode
  },
) {
  const t0 = ac.currentTime + start
  const bufferSize = Math.floor(ac.sampleRate * duration)
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const src = ac.createBufferSource()
  src.buffer = buffer
  let node: AudioNode = src
  const hp = ac.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = highpass
  node.connect(hp)
  node = hp
  if (lowpass) {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = lowpass
    node.connect(lp)
    node = lp
  }
  const g = ac.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  node.connect(g).connect(dest ?? getSfxBus(ac))
  src.start(t0)
}

export function playSound(name: SoundName) {
  if (muted) return
  const ac = getCtx()
  if (!ac) return

  switch (name) {
    case 'click':
      // Crisp UI tick — short, bright, tactile
      tone(ac, { freq: vary(1900, 40), duration: 0.045, gain: 0.05, type: 'triangle' })
      noiseBurst(ac, { duration: 0.025, gain: 0.02, highpass: 4000 })
      break
    case 'deal':
      // Card swoosh + soft landing thwack
      noiseBurst(ac, { duration: 0.13, gain: 0.05, highpass: 900, lowpass: 6500 })
      tone(ac, {
        freq: vary(210, 60),
        start: 0.1,
        duration: 0.07,
        gain: 0.045,
        type: 'sine',
        endFreq: 130,
      })
      break
    case 'flip':
      // Snappy card flip
      noiseBurst(ac, { duration: 0.05, gain: 0.045, highpass: 2500 })
      tone(ac, { freq: vary(920, 50), duration: 0.09, gain: 0.03, type: 'triangle', endFreq: 1400 })
      break
    case 'chip':
      // Ceramic chip clack: layered clinks with random detune
      tone(ac, { freq: vary(2450, 70), duration: 0.05, gain: 0.06, type: 'triangle' })
      tone(ac, { freq: vary(3300, 70), start: 0.028, duration: 0.05, gain: 0.045, type: 'triangle' })
      tone(ac, { freq: vary(4100, 90), start: 0.05, duration: 0.04, gain: 0.02, type: 'sine' })
      noiseBurst(ac, { duration: 0.03, gain: 0.02, highpass: 5000 })
      break
    case 'stand':
      // Confident low knock on the felt
      tone(ac, { freq: vary(150, 30), duration: 0.12, gain: 0.07, type: 'sine', endFreq: 95 })
      noiseBurst(ac, { duration: 0.05, gain: 0.03, highpass: 300, lowpass: 1800 })
      break
    case 'push':
      // Neutral two-note shrug
      tone(ac, { freq: 440, duration: 0.18, gain: 0.04, type: 'sine' })
      tone(ac, { freq: 440, start: 0.16, duration: 0.24, gain: 0.035, type: 'sine' })
      break
    case 'win':
      // Bright ascending chime with sparkle tail
      tone(ac, { freq: 523.25, duration: 0.28, gain: 0.055 })
      tone(ac, { freq: 659.25, start: 0.1, duration: 0.32, gain: 0.055 })
      tone(ac, { freq: 783.99, start: 0.2, duration: 0.42, gain: 0.055 })
      tone(ac, { freq: 1046.5, start: 0.3, duration: 0.5, gain: 0.04, type: 'triangle' })
      noiseBurst(ac, { start: 0.28, duration: 0.3, gain: 0.012, highpass: 7000 })
      break
    case 'lose':
      // Soft low descending sigh
      tone(ac, { freq: 220, duration: 0.35, gain: 0.045, endFreq: 160, type: 'sine' })
      tone(ac, { freq: 165, start: 0.18, duration: 0.4, gain: 0.03, endFreq: 110, type: 'sine' })
      break
    case 'blackjack':
      // Gold fanfare: arpeggio + octave stinger + shimmer
      tone(ac, { freq: 523.25, duration: 0.4, gain: 0.055 })
      tone(ac, { freq: 659.25, start: 0.07, duration: 0.4, gain: 0.055 })
      tone(ac, { freq: 783.99, start: 0.14, duration: 0.45, gain: 0.055 })
      tone(ac, { freq: 1046.5, start: 0.22, duration: 0.6, gain: 0.06 })
      tone(ac, { freq: 1318.5, start: 0.34, duration: 0.7, gain: 0.045, type: 'triangle' })
      tone(ac, { freq: 2093, start: 0.34, duration: 0.8, gain: 0.02, type: 'sine' })
      noiseBurst(ac, { start: 0.3, duration: 0.5, gain: 0.015, highpass: 8000 })
      break
  }
}

/* ────────────────────────────────────────────────────────────
 * Background music: a slow, warm lo-fi loop.
 * Jazzy minor-7th chord pads + soft bass + brushed hats,
 * with a gentle pentatonic melody that varies each pass.
 * ──────────────────────────────────────────────────────────── */

let musicPlaying = false
let schedulerTimer: ReturnType<typeof setInterval> | null = null
let nextBarTime = 0
let barIndex = 0

const BAR_SECONDS = 2.6 // ~92bpm feel, 4 beats per bar

// Warm progression: Am9 → Fmaj7 → Cmaj7 → G6 (frequencies in Hz)
const CHORDS: { bass: number; pad: number[] }[] = [
  { bass: 55.0, pad: [220.0, 261.63, 329.63, 493.88] }, // Am9
  { bass: 43.65, pad: [174.61, 220.0, 261.63, 329.63] }, // Fmaj7
  { bass: 65.41, pad: [196.0, 261.63, 329.63, 392.0] }, // Cmaj7
  { bass: 49.0, pad: [196.0, 246.94, 293.66, 392.0] }, // G6
]

// A-minor pentatonic pool for the melody hook
const MELODY_POOL = [440.0, 523.25, 587.33, 659.25, 783.99, 880.0]

function getMusicBus(ac: AudioContext): GainNode {
  if (!musicBus) {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 3200
    musicBus = ac.createGain()
    musicBus.gain.value = musicMuted ? 0 : MUSIC_VOLUME
    musicBus.connect(lp)
    lp.connect(ac.destination)
  }
  return musicBus
}

function scheduleBar(ac: AudioContext, bus: GainNode, t0: number, bar: number) {
  const chord = CHORDS[bar % CHORDS.length]

  // Pad: slow-attack triangle chord, held for the whole bar
  for (const f of chord.pad) {
    tone(ac, {
      freq: f,
      type: 'triangle',
      start: t0 - ac.currentTime,
      duration: BAR_SECONDS * 0.95,
      gain: 0.3,
      attack: 0.7,
      dest: bus,
    })
  }

  // Bass: two soft notes per bar (beat 1 and the "and" of 3)
  tone(ac, {
    freq: chord.bass * 2,
    type: 'sine',
    start: t0 - ac.currentTime,
    duration: 1.0,
    gain: 0.55,
    attack: 0.03,
    dest: bus,
  })
  tone(ac, {
    freq: chord.bass * 2,
    type: 'sine',
    start: t0 - ac.currentTime + BAR_SECONDS * 0.625,
    duration: 0.7,
    gain: 0.4,
    attack: 0.03,
    dest: bus,
  })

  // Brushed hats: light swung 8ths
  for (let i = 0; i < 8; i++) {
    const swing = i % 2 === 1 ? 0.07 : 0
    noiseBurst(ac, {
      start: t0 - ac.currentTime + (i / 8) * BAR_SECONDS + swing,
      duration: 0.04,
      gain: i % 4 === 2 ? 0.09 : 0.05,
      highpass: 8000,
      dest: bus,
    })
  }

  // Melody: sparse pentatonic pluck, ~2 notes per bar, skips some bars
  if (bar % 4 !== 3) {
    const count = 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < count; i++) {
      const note = MELODY_POOL[Math.floor(Math.random() * MELODY_POOL.length)]
      tone(ac, {
        freq: note,
        type: 'sine',
        start: t0 - ac.currentTime + Math.random() * BAR_SECONDS * 0.7,
        duration: 0.9,
        gain: 0.22,
        attack: 0.02,
        dest: bus,
      })
    }
  }
}

export function startMusic() {
  if (musicPlaying) return
  const ac = getCtx()
  if (!ac || ac.state !== 'running') return
  musicPlaying = true

  const bus = getMusicBus(ac)
  bus.gain.cancelScheduledValues(ac.currentTime)
  bus.gain.setValueAtTime(0, ac.currentTime)
  if (!musicMuted) bus.gain.linearRampToValueAtTime(MUSIC_VOLUME, ac.currentTime + 2.5)

  nextBarTime = ac.currentTime + 0.1
  barIndex = 0

  schedulerTimer = setInterval(() => {
    if (!ctx) return
    // Look ahead and schedule any bar starting within the next 0.5s
    while (nextBarTime < ctx.currentTime + 0.5) {
      scheduleBar(ctx, getMusicBus(ctx), nextBarTime, barIndex)
      nextBarTime += BAR_SECONDS
      barIndex++
    }
  }, 120)
}

export function stopMusic() {
  if (!musicPlaying) return
  musicPlaying = false
  if (schedulerTimer) {
    clearInterval(schedulerTimer)
    schedulerTimer = null
  }
  if (musicBus && ctx) {
    musicBus.gain.cancelScheduledValues(ctx.currentTime)
    musicBus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
  }
}

/** Call from a user-gesture context to unlock audio + kick off music. */
export function ensureAudioUnlocked() {
  const ac = getCtx()
  if (!ac) return
  if (ac.state === 'running') startMusic()
  else void ac.resume().then(() => startMusic())
}
