// All sound is synthesized with WebAudio: no audio files, no network. A
// small chiptune loop (bass + plucked lead over a minor-key groove) plays
// while driving or walking, the engine hum follows the car's speed, the
// siren wails while the police are after the player, and short blips cover
// punches, shots, crashes, pickups and mission jingles.

const MUSIC_BPM = 112;
const BASS_LINE = [45, 45, 48, 43, 45, 45, 50, 48];
const LEAD_LINE = [69, 72, 76, 72, 74, 76, 79, 76, 77, 76, 74, 72, 71, 72, 69, 67];

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let musicTimer = null;
  let muted = false;
  let step = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.55;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function tone(freq, duration, type, volume, when = 0) {
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function noiseBurst(duration, volume, lowpass = 1200) {
    if (!ctx) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  function scheduleStep() {
    if (!ctx) return;
    const beat = 60 / MUSIC_BPM / 2;
    const bass = BASS_LINE[step % BASS_LINE.length];
    const lead = LEAD_LINE[step % LEAD_LINE.length];
    tone(midiToFreq(bass - 12), beat * 1.8, 'triangle', 0.5);
    if (step % 2 === 0) tone(midiToFreq(lead), beat * 0.9, 'square', 0.12);
    if (step % 4 === 0) noiseBurst(0.05, 0.10, 4000);
    step += 1;
  }

  return {
    ensure,
    get isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.55;
      return muted;
    },
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicTimer = window.setInterval(scheduleStep, (60 / MUSIC_BPM / 2) * 1000);
    },
    stopMusic() {
      if (musicTimer) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
    /** 0 = parked, 1 = flat out: the engine hum follows it. */
    setEngine(amount) {
      if (!ctx) return;
      engineOsc.frequency.setTargetAtTime(52 + amount * 165, ctx.currentTime, 0.08);
      engineGain.gain.setTargetAtTime(amount * 0.055, ctx.currentTime, 0.1);
    },
    /** The two-tone siren while `on`; call every frame. */
    setSiren(on, dt) {
      if (!ctx) return;
      if (on) {
        sirenTimer += dt;
        const high = Math.floor(sirenTimer * 2.2) % 2 === 0;
        sirenOsc.frequency.setTargetAtTime(high ? 950 : 680, ctx.currentTime, 0.05);
        sirenGain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.1);
      } else {
        sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      }
    },
    punch() {
      tone(140, 0.09, 'sine', 0.5);
      noiseBurst(0.06, 0.25, 900);
    },
    shoot() {
      noiseBurst(0.12, 0.4, 3200);
      tone(880, 0.06, 'square', 0.12);
    },
    crash(strength) {
      noiseBurst(0.18, Math.min(0.6, 0.15 + strength * 0.4), 700);
      tone(70, 0.2, 'sine', 0.4);
    },
    pickup() {
      tone(880, 0.09, 'sine', 0.3);
      tone(1318, 0.14, 'sine', 0.3, 0.08);
    },
    missionDone() {
      [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.35, i * 0.11));
    },
    busted() {
      [392, 330, 262].forEach((freq, i) => tone(freq, 0.3, 'sawtooth', 0.25, i * 0.18));
    },
    denied() {
      tone(220, 0.12, 'square', 0.2);
    },
    enterCar() {
      tone(300, 0.08, 'triangle', 0.25);
      tone(420, 0.1, 'triangle', 0.25, 0.07);
    },
  };
}
