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

const MUSIC_VOLUME = 0.12

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
 * Background music: Mozart - Eine Kleine Nachtmusik (public domain)
 * Streamed via <audio> element, routed through the Web Audio music bus
 * so the existing mute toggle works seamlessly.
 * ──────────────────────────────────────────────────────────── */

// Public domain Mozart recording from IMSLP / Internet Archive
const MOZART_URL = '/music/mozart.mp3'

let musicPlaying = false
let mozartEl: HTMLAudioElement | null = null
let mozartSource: MediaElementAudioSourceNode | null = null

function getMusicBus(ac: AudioContext): GainNode {
  if (!musicBus) {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 6000
    musicBus = ac.createGain()
    musicBus.gain.value = musicMuted ? 0 : MUSIC_VOLUME
    musicBus.connect(lp)
    lp.connect(ac.destination)
  }
  return musicBus
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

  if (!mozartEl) {
    mozartEl = new Audio(MOZART_URL)
    mozartEl.loop = true
    mozartEl.crossOrigin = 'anonymous'
    mozartSource = ac.createMediaElementSource(mozartEl)
    mozartSource.connect(bus)
  }
  void mozartEl.play().catch(() => {})
}

export function stopMusic() {
  if (!musicPlaying) return
  musicPlaying = false
  if (mozartEl) {
    mozartEl.pause()
    mozartEl.currentTime = 0
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
