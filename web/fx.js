/* global confetti, Howl, tsParticles */
(function (global) {
  function makeWavDataUri(freq, durationSec, volume, type) {
    const sampleRate = 22050;
    const n = Math.floor(sampleRate * durationSec);
    const data = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const t = i / sampleRate;
      const env = Math.min(1, t * 40) * Math.max(0, 1 - t / durationSec);
      let wave = 0;
      if (type === 'square') wave = Math.sign(Math.sin(2 * Math.PI * freq * t));
      else if (type === 'triangle') {
        wave = 2 * Math.abs(2 * ((freq * t) % 1) - 1) - 1;
      } else wave = Math.sin(2 * Math.PI * freq * t);
      data[i] = wave * env * volume;
    }
    const buffer = new ArrayBuffer(44 + n * 2);
    const view = new DataView(buffer);
    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + n * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, n * 2, true);
    let offset = 44;
    for (let i = 0; i < n; i += 1) {
      const s = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return `data:audio/wav;base64,${btoa(binary)}`;
  }

  const sounds = {};
  const baseVolumes = {
    place: 0.35,
    win: 0.4,
    lose: 0.35,
    emote: 0.25,
    click: 0.2,
    urgent: 0.3,
    chat: 0.22,
  };
  let muted = localStorage.getItem('qiba_mute') === '1';
  let volume = Math.min(100, Math.max(0, Number(localStorage.getItem('qiba_volume') ?? 80)));
  let bgmEnabled = localStorage.getItem('qiba_bgm') !== '0'; // 默认开启
  let bgmVolume = Math.min(100, Math.max(0, Number(localStorage.getItem('qiba_bgm_volume') ?? 10)));
  let particlesReady = false;
  let bgmHowl = null;
  let bgmUnlockBound = false;

  function masterGain() {
    if (muted) return 0;
    return volume / 100;
  }

  function bgmGain() {
    if (!bgmEnabled) return 0;
    return bgmVolume / 100;
  }

  function applyVolumes() {
    const g = masterGain();
    Object.keys(sounds).forEach((key) => {
      if (sounds[key] && baseVolumes[key] != null) {
        sounds[key].volume(baseVolumes[key] * g);
      }
    });
    if (bgmHowl) bgmHowl.volume(bgmGain());
  }

  function ensureBgm() {
    if (!global.Howl || bgmHowl) return;
    bgmHowl = new global.Howl({
      src: ['/assets/bgm-evolve.ogg'],
      loop: true,
      volume: bgmGain(),
      html5: true,
      preload: true,
    });
  }

  function playBgm() {
    ensureBgm();
    if (!bgmHowl || !bgmEnabled || bgmVolume <= 0) return;
    bgmHowl.volume(bgmGain());
    if (!bgmHowl.playing()) bgmHowl.play();
  }

  function stopBgm() {
    if (bgmHowl && bgmHowl.playing()) bgmHowl.pause();
  }

  function syncBgm() {
    applyVolumes();
    if (bgmEnabled && bgmVolume > 0) playBgm();
    else stopBgm();
  }

  function setBgmEnabled(on) {
    bgmEnabled = !!on;
    localStorage.setItem('qiba_bgm', bgmEnabled ? '1' : '0');
    syncBgm();
    return bgmEnabled;
  }

  function isBgmEnabled() {
    return bgmEnabled;
  }

  function setBgmVolume(v) {
    bgmVolume = Math.min(100, Math.max(0, Number(v) || 0));
    localStorage.setItem('qiba_bgm_volume', String(bgmVolume));
    syncBgm();
    return bgmVolume;
  }

  function getBgmVolume() {
    return bgmVolume;
  }

  function unlockAudioOnce() {
    if (bgmUnlockBound) return;
    bgmUnlockBound = true;
    const kick = () => {
      ensureSounds();
      syncBgm();
      document.removeEventListener('pointerdown', kick);
      document.removeEventListener('keydown', kick);
    };
    document.addEventListener('pointerdown', kick, { once: true });
    document.addEventListener('keydown', kick, { once: true });
  }

  function ensureSounds() {
    if (!global.Howl || sounds.place) return;
    const mk = (freq, dur, vol, type) => new global.Howl({
      src: [makeWavDataUri(freq, dur, vol, type)],
      volume: vol * masterGain(),
    });
    sounds.place = mk(660, 0.08, baseVolumes.place, 'sine');
    sounds.win = mk(523, 0.18, baseVolumes.win, 'triangle');
    sounds.lose = mk(180, 0.22, baseVolumes.lose, 'square');
    sounds.emote = mk(880, 0.06, baseVolumes.emote, 'sine');
    sounds.click = mk(420, 0.04, baseVolumes.click, 'triangle');
    sounds.urgent = mk(920, 0.05, baseVolumes.urgent, 'square');
    sounds.chat = mk(740, 0.05, baseVolumes.chat, 'sine');
    applyVolumes();
  }

  function setMuted(v) {
    muted = !!v;
    localStorage.setItem('qiba_mute', muted ? '1' : '0');
    applyVolumes();
    return muted;
  }

  let vibrateOn = localStorage.getItem('qiba_vibrate') !== '0';

  function setVibrateEnabled(v) {
    vibrateOn = !!v;
    localStorage.setItem('qiba_vibrate', vibrateOn ? '1' : '0');
    return vibrateOn;
  }

  function isVibrateEnabled() {
    return vibrateOn;
  }

  function buzz(ms) {
    if (!vibrateOn) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(ms || 12);
      }
    } catch {
      /* ignore */
    }
  }

  function play(name) {
    if (name === 'place' || name === 'win' || name === 'lose') buzz(name === 'place' ? 10 : 24);
    if (muted || volume <= 0) return;
    ensureSounds();
    const s = sounds[name];
    if (s) s.play();
  }

  function setVolume(v) {
    volume = Math.min(100, Math.max(0, Number(v) || 0));
    localStorage.setItem('qiba_volume', String(volume));
    if (volume === 0) {
      muted = true;
      localStorage.setItem('qiba_mute', '1');
    } else if (muted && volume > 0) {
      muted = false;
      localStorage.setItem('qiba_mute', '0');
    }
    ensureSounds();
    applyVolumes();
    return volume;
  }

  function getVolume() {
    return volume;
  }

  function toggleMute() {
    muted = !muted;
    localStorage.setItem('qiba_mute', muted ? '1' : '0');
    applyVolumes();
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function celebrateWin() {
    if (typeof global.confetti !== 'function') return;
    const colors = ['#ff6a00', '#4fd2ff', '#ffd0a8', '#5dffa8', '#ffffff'];
    const end = Date.now() + 1200;
    (function frame() {
      global.confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
        disableForReducedMotion: true,
      });
      global.confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
        disableForReducedMotion: true,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    play('win');
  }

  function celebrateDraw() {
    if (typeof global.confetti === 'function') {
      global.confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b97ab', '#4fd2ff', '#ff9a3c'],
        disableForReducedMotion: true,
      });
    }
  }

  async function initParticles(elId) {
    if (!global.tsParticles || particlesReady) return;
    const el = document.getElementById(elId);
    if (!el) return;
    try {
      await global.tsParticles.load(elId, {
        fullScreen: { enable: false },
        background: { color: { value: 'transparent' } },
        fpsLimit: 45,
        particles: {
          number: { value: 42, density: { enable: true, area: 900 } },
          color: { value: ['#ff6a00', '#4fd2ff', '#ff9a3c'] },
          links: {
            enable: true,
            color: '#4fd2ff',
            opacity: 0.18,
            distance: 130,
            width: 1,
          },
          move: { enable: true, speed: 0.55, outModes: { default: 'bounce' } },
          opacity: { value: 0.35 },
          size: { value: { min: 1, max: 2.4 } },
        },
        detectRetina: true,
        pauseOnBlur: true,
      });
      particlesReady = true;
    } catch (e) {
      console.warn('tsParticles init failed', e);
    }
  }

  global.QibaFx = {
    play,
    toggleMute,
    isMuted,
    setMuted,
    setVolume,
    getVolume,
    setBgmEnabled,
    isBgmEnabled,
    setBgmVolume,
    getBgmVolume,
    setVibrateEnabled,
    isVibrateEnabled,
    buzz,
    syncBgm,
    unlockAudioOnce,
    celebrateWin,
    celebrateDraw,
    initParticles,
    ensureSounds,
  };

  unlockAudioOnce();
})(window);
