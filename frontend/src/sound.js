function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const SAMPLE_PATHS = {
  beep: '/sounds/beep.wav',
  beepHigh: '/sounds/beep-high.wav',
  fanfare: '/sounds/fanfare.wav',
};

function parseBlindPair(blindText) {
  const match = (blindText || '').match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) {
    return null;
  }
  return { smallBlind: match[1], bigBlind: match[2] };
}

export function createSoundManager() {
  let audioContext = null;
  let musicAudio = null;
  let musicFadeIntervalId = null;
  let duckCounter = 0;
  let settings = {
    muted: false,
    beepVolume: 1,
    musicVolume: 0.22,
    speechEnabled: true,
    useSampleSounds: true,
    speechStyle: 'neutral',
    voicePreference: 'auto',
    onNowPlayingChange: null,
  };

  const setSettings = (next) => {
    settings = {
      ...settings,
      ...next,
      beepVolume: clamp(Number(next?.beepVolume ?? settings.beepVolume), 0, 1),
      musicVolume: clamp(Number(next?.musicVolume ?? settings.musicVolume), 0, 1),
      useSampleSounds: next?.useSampleSounds ?? settings.useSampleSounds,
      speechStyle: next?.speechStyle === 'commentator' ? 'commentator' : 'neutral',
      voicePreference: next?.voicePreference === 'male'
        ? 'male'
        : next?.voicePreference === 'female'
          ? 'female'
          : 'auto',
      onNowPlayingChange: typeof next?.onNowPlayingChange === 'function'
        ? next.onNowPlayingChange
        : settings.onNowPlayingChange,
    };

    if (musicAudio) {
      updateMusicVolume();
    }
  };

  const getMusicTargetVolume = () => {
    if (settings.muted) {
      return 0;
    }

    const duckFactor = duckCounter > 0 ? 0.6 : 1;
    return clamp(settings.musicVolume * duckFactor, 0, 1);
  };

  const clearMusicFade = () => {
    if (musicFadeIntervalId !== null) {
      window.clearInterval(musicFadeIntervalId);
      musicFadeIntervalId = null;
    }
  };

  const updateMusicVolume = () => {
    if (!musicAudio) {
      return;
    }
    musicAudio.volume = getMusicTargetVolume();
  };

  const fadeAudioVolume = (audio, toVolume, durationMs = 1000) => new Promise((resolve) => {
    if (!audio) {
      resolve();
      return;
    }

    const safeDuration = Math.max(1, Number(durationMs) || 1);
    const fromVolume = Number.isFinite(audio.volume) ? audio.volume : 0;
    const target = clamp(toVolume, 0, 1);

    if (safeDuration <= 30) {
      audio.volume = target;
      resolve();
      return;
    }

    const start = Date.now();
    const tickMs = 40;
    const timerId = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = clamp(elapsed / safeDuration, 0, 1);
      audio.volume = fromVolume + ((target - fromVolume) * progress);
      if (progress >= 1) {
        window.clearInterval(timerId);
        resolve();
      }
    }, tickMs);
  });

  const withMusicDuck = async (action) => {
    duckCounter += 1;
    if (musicAudio) {
      void fadeAudioVolume(musicAudio, getMusicTargetVolume(), 350);
    }
    try {
      return await action();
    } finally {
      duckCounter = Math.max(0, duckCounter - 1);
      if (musicAudio) {
        void fadeAudioVolume(musicAudio, getMusicTargetVolume(), 600);
      }
    }
  };

  const createLoopAudio = (url) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = 0;
    return audio;
  };

  const startBackgroundMusic = async (url, options = {}) => {
    if (!url) {
      return;
    }

    const fadeInMs = Math.max(0, Number(options.fadeInMs) || 0);
    const crossfadeMs = Math.max(0, Number(options.crossfadeMs) || 0);
    const nextTrack = createLoopAudio(url);
    const targetVolume = getMusicTargetVolume();

    try {
      await nextTrack.play();
    } catch {
      return;
    }

    if (musicAudio && crossfadeMs > 0) {
      const previous = musicAudio;
      musicAudio = nextTrack;
      await Promise.all([
        fadeAudioVolume(nextTrack, targetVolume, crossfadeMs),
        fadeAudioVolume(previous, 0, crossfadeMs),
      ]);
      previous.pause();
      previous.currentTime = 0;
      return;
    }

    if (musicAudio) {
      musicAudio.pause();
      musicAudio.currentTime = 0;
    }

    musicAudio = nextTrack;
    if (fadeInMs > 0) {
      await fadeAudioVolume(musicAudio, targetVolume, fadeInMs);
      return;
    }

    updateMusicVolume();
  };

  const stopBackgroundMusic = async ({ fadeOutMs = 1000 } = {}) => {
    if (!musicAudio) {
      return;
    }

    clearMusicFade();
    const current = musicAudio;
    if (fadeOutMs > 0) {
      await fadeAudioVolume(current, 0, fadeOutMs);
    } else {
      current.volume = 0;
    }
    current.pause();
    current.currentTime = 0;

    if (musicAudio === current) {
      musicAudio = null;
    }
  };

  const MALE_VOICE_KEYWORDS = [
    'male', 'mann', 'männlich', 'stefan', 'hans', 'markus', 'daniel', 'thomas', 'david', 'michael',
  ];

  const FEMALE_VOICE_KEYWORDS = [
    'female', 'frau', 'weiblich', 'anna', 'petra', 'julia', 'sarah', 'karen', 'zira', 'katja',
  ];

  const getSpeechVoices = async () => {
    if (!('speechSynthesis' in window)) {
      return [];
    }

    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      return existing;
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(window.speechSynthesis.getVoices());
      };

      const onVoicesChanged = () => finish();
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      window.setTimeout(finish, 900);
    });
  };

  const pickVoiceByPreference = (voices, lang, preference) => {
    const normalizedLang = String(lang || 'de-DE').toLowerCase();
    const byLanguage = voices.filter((voice) => String(voice.lang || '').toLowerCase().startsWith(normalizedLang.slice(0, 2)));
    const candidates = byLanguage.length > 0 ? byLanguage : voices;
    if (candidates.length === 0) {
      return null;
    }

    if (preference === 'auto') {
      return candidates[0];
    }

    const keywords = preference === 'male' ? MALE_VOICE_KEYWORDS : FEMALE_VOICE_KEYWORDS;
    const byKeyword = candidates.find((voice) => {
      const text = `${voice.name || ''} ${voice.voiceURI || ''}`.toLowerCase();
      return keywords.some((keyword) => text.includes(keyword));
    });

    return byKeyword || candidates[0];
  };

  const setNowPlaying = (label) => {
    if (typeof settings.onNowPlayingChange === 'function') {
      settings.onNowPlayingChange(label || 'Kein Sound aktiv');
    }
  };

  const playSample = async (url, expectedDurationMs, volume = 1, label = 'Audio-Sample', timeoutMs = null) => {
    if (settings.muted || !settings.useSampleSounds) {
      return false;
    }

    try {
      await withMusicDuck(async () => {
        setNowPlaying(label);
        await new Promise((resolve, reject) => {
          const audio = new Audio(url);
          audio.preload = 'auto';
          audio.volume = clamp(volume * settings.beepVolume, 0, 1);
          let settled = false;
          let timeoutId = null;

          const cleanup = () => {
            audio.onended = null;
            audio.onerror = null;
            audio.oncanplaythrough = null;
            if (timeoutId !== null) {
              window.clearTimeout(timeoutId);
              timeoutId = null;
            }
          };

          const finish = (callback) => {
            if (settled) {
              return;
            }
            settled = true;
            cleanup();
            callback();
          };

          audio.onended = () => {
            finish(resolve);
          };

          audio.onerror = () => {
            finish(() => reject(new Error(`Sample konnte nicht geladen werden: ${url}`)));
          };

          audio.oncanplaythrough = () => {
            audio.play().catch((error) => finish(() => reject(error)));
          };

          timeoutId = window.setTimeout(() => {
            finish(() => reject(new Error(`Sample Timeout: ${url}`)));
          }, timeoutMs ?? Math.max(4500, expectedDurationMs + 2200));

          audio.load();
        });
      });

      setNowPlaying('Kein Sound aktiv');
      return true;
    } catch {
      setNowPlaying('Kein Sound aktiv');
      return false;
    }
  };

  const getContext = async () => {
    if (!audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        throw new Error('AudioContext wird von diesem Browser nicht unterstützt.');
      }
      audioContext = new Ctx();
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    return audioContext;
  };

  const playTone = async (frequency, durationMs, type = 'square', volume = 0.07, label = 'Signalton') => {
    if (settings.muted) {
      await wait(durationMs + 25);
      return;
    }

    await withMusicDuck(async () => {
      setNowPlaying(label);

      const ctx = await getContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      const finalVolume = clamp(volume * settings.beepVolume, 0, 1);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(finalVolume, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (durationMs / 1000));

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + (durationMs / 1000) + 0.02);

      await wait(durationMs + 25);
      setNowPlaying('Kein Sound aktiv');
    });
  };

  const playBeep = async () => {
    const played = await playSample(SAMPLE_PATHS.beep, 500, 0.9, 'Beep (Stufenende)');
    if (!played) {
      await playTone(980, 500, 'square', 0.08, 'Beep (Stufenende)');
    }
  };

  const playTransitionHighBeep = async () => {
    const playedHigh = await playSample(SAMPLE_PATHS.beepHigh, 950, 0.95, 'Hoher Beep (Stufenwechsel)');
    if (!playedHigh) {
      await playTone(1480, 950, 'square', 0.1, 'Hoher Beep (Stufenwechsel)');
    }
  };

  const playBlindStageTransition = async () => {
    // 5 seconds total: 0.5s beep + 0.5s pause, repeated 5 times.
    for (let i = 0; i < 4; i += 1) {
      const cycleStart = Date.now();
      await playBeep();
      const elapsed = Date.now() - cycleStart;
      if (elapsed < 1000) {
        await wait(1000 - elapsed);
      }
    }

    // Stage start indicator at transition.
    await playTransitionHighBeep();
  };

  const playBeepSeries = async (count = 5, gapMs = 220) => {
    for (let i = 0; i < count; i += 1) {
      await playBeep();
      if (i < count - 1) {
        await wait(gapMs);
      }
    }
  };

  const playFanfare = async () => {
    const playedSample = await playSample(SAMPLE_PATHS.fanfare, 1400, 0.95, 'Fanfare');
    if (playedSample) {
      return;
    }

    await playTone(523.25, 180, 'triangle', 0.08, 'Fanfare');
    await wait(40);
    await playTone(659.25, 180, 'triangle', 0.08, 'Fanfare');
    await wait(40);
    await playTone(783.99, 280, 'triangle', 0.09, 'Fanfare');
    await wait(40);
    await playTone(1046.5, 420, 'triangle', 0.1, 'Fanfare');
  };

  const speak = async (text, options = {}) => {
    if (settings.muted || !settings.speechEnabled) {
      return;
    }

    if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) {
      return;
    }

    await withMusicDuck(async () => {
      setNowPlaying(`Sprachansage: ${text}`);
      window.speechSynthesis.cancel();
      const lang = options.lang || 'de-DE';
      const voices = await getSpeechVoices();
      const voice = pickVoiceByPreference(voices, lang, settings.voicePreference);

      await new Promise((resolve) => {
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        if (voice) {
          utterance.voice = voice;
        }
        utterance.rate = options.rate ?? 1;
        utterance.pitch = options.pitch ?? 1;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
      setNowPlaying('Kein Sound aktiv');
    });
  };

  const speakPlayerName = async (name) => {
    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      return;
    }

    if (settings.speechStyle === 'commentator') {
      await speak(`Am Tisch: ${trimmedName}!`, { rate: 1.12, pitch: 1.22 });
      return;
    }

    await speak(trimmedName);
  };

  const speakBlindLevel = async (blindText) => {
    const parsed = parseBlindPair(blindText);
    if (parsed) {
      await speak(`The blinds are now ${parsed.smallBlind} for the small blind and ${parsed.bigBlind} for the big blind`, { lang: 'en-US' });
      return;
    }

    await speak(`The blinds are now ${blindText}`, { lang: 'en-US' });
  };

  const speakBreakStart = async (minutes) => {
    const safeMinutes = Math.max(1, Number(minutes) || 1);
    const minuteWord = safeMinutes === 1 ? 'minute' : 'minutes';
    await speak(`We're going to take a ${safeMinutes} ${minuteWord} break now`, { lang: 'en-US' });
  };

  const announceBlindLevelChange = async (blindText) => {
    await playBlindStageTransition();
    await speakBlindLevel(blindText);
  };

  const announceSeatPlacement = async ({ tableNumber, seatNumber, playerName, roles }) => {
    const name = String(playerName || '').trim();
    if (!name) {
      return;
    }

    const roleLabels = {
      dealer: 'dealer',
      'small-blind': 'small blind',
      'big-blind': 'big blind',
    };
    const validRoles = Array.isArray(roles)
      ? roles.filter((entry) => roleLabels[entry])
      : [];

    let roleSentence = '';
    if (validRoles.length === 1) {
      roleSentence = ` ${roleLabels[validRoles[0]]}.`;
    } else if (validRoles.length > 1) {
      const joined = validRoles.map((entry) => roleLabels[entry]).join(' and ');
      roleSentence = ` ${joined}.`;
    }

    await speak(`At table ${tableNumber}, seat ${seatNumber}.${roleSentence}`, { lang: 'en-US' });
  };

  const runDemo = async () => {
    await announceBlindLevelChange('50/100');

    const demoNames = ['Jan', 'Holger', 'Christoph', 'Jens', 'Mario', 'Michael'];
    for (const name of demoNames) {
      await speakPlayerName(name);
      await wait(140);
    }
  };

  const playOneShot = async (url, label = 'Soundeffekt') => {
    if (!url) {
      return false;
    }

    if (settings.muted) {
      return false;
    }

    try {
      await withMusicDuck(async () => {
        setNowPlaying(label);
        await new Promise((resolve, reject) => {
          const audio = new Audio(url);
          audio.preload = 'auto';
          audio.volume = clamp(0.95 * settings.beepVolume, 0, 1);
          let settled = false;
          let timeoutId = null;

          const cleanup = () => {
            audio.onended = null;
            audio.onerror = null;
            audio.oncanplaythrough = null;
            if (timeoutId !== null) {
              window.clearTimeout(timeoutId);
              timeoutId = null;
            }
          };

          const finish = (callback) => {
            if (settled) {
              return;
            }
            settled = true;
            cleanup();
            callback();
          };

          audio.onended = () => finish(resolve);
          audio.onerror = () => finish(() => reject(new Error(`Audio konnte nicht geladen werden: ${url}`)));
          audio.oncanplaythrough = () => {
            audio.play().catch((error) => finish(() => reject(error)));
          };

          timeoutId = window.setTimeout(() => {
            finish(() => reject(new Error(`Audio Timeout: ${url}`)));
          }, 15000);

          audio.load();
        });
      });

      setNowPlaying('Kein Sound aktiv');
      return true;
    } catch {
      setNowPlaying('Kein Sound aktiv');
      return false;
    }
  };

  return {
    setSettings,
    wait,
    startBackgroundMusic,
    stopBackgroundMusic,
    playOneShot,
    playBeep,
    playTransitionHighBeep,
    playBlindStageTransition,
    playBeepSeries,
    playFanfare,
    speak,
    speakPlayerName,
    announceSeatPlacement,
    announceBlindLevelChange,
    speakBlindLevel,
    speakBreakStart,
    runDemo,
  };
}
