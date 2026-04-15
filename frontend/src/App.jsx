import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AUTH_TOKEN_KEY, getRandomDelayMs } from './api';
import {
  AUDIO_TIMING_CONFIG,
  AVAILABLE_SOUND_FILES,
  DEFAULT_BLIND_LEVELS,
  DEFAULT_SPECIAL_SEAT_SOUNDS,
  SEAT_OPEN_SOUND,
  STEP_MUSIC_TRACKS,
  initialForm,
} from './constants';
import LoginPage from './pages/LoginPage';
import PreparationPage from './pages/PreparationPage';
import RegistrationPage from './pages/RegistrationPage';
import { createSoundManager } from './sound';
import TournamentPage from './pages/TournamentPage';

function App() {
  const [step, setStep] = useState('registration');
  const [status, setStatus] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [message, setMessage] = useState('');
  const [activeTablePopup, setActiveTablePopup] = useState(null);
  const [savedTemplateId, setSavedTemplateId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [soundBusy, setSoundBusy] = useState(false);
  const [tournamentActionBusy, setTournamentActionBusy] = useState(false);
  const [specialSeatSounds, setSpecialSeatSounds] = useState(DEFAULT_SPECIAL_SEAT_SOUNDS);
  const [newMappingName, setNewMappingName] = useState('');
  const [newMappingSound, setNewMappingSound] = useState(AVAILABLE_SOUND_FILES[0] ? `/sounds/${AVAILABLE_SOUND_FILES[0]}` : '');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showTournamentTables, setShowTournamentTables] = useState(true);
  const [currentSoundLabel, setCurrentSoundLabel] = useState('Kein Sound aktiv');
  const [createTournamentConfirmOpen, setCreateTournamentConfirmOpen] = useState(false);
  const [abortTournamentConfirmOpen, setAbortTournamentConfirmOpen] = useState(false);
  const [soundSettings, setSoundSettings] = useState({
    muted: false,
    beepVolume: 1,
    musicVolume: 0.22,
    speechEnabled: true,
    useSampleSounds: true,
    speechStyle: 'neutral',
    voicePreference: 'auto',
    seatShowEnabled: true,
    seatShowSpeed: 'normal',
    seatShowVoiceEnabled: true,
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authPopup, setAuthPopup] = useState('');
  const importInputRef = useRef(null);
  const authTimeoutRef = useRef(null);
  const soundManagerRef = useRef(null);
  const scheduleSnapshotRef = useRef(null);
  const playedCountdownSecondKeysRef = useRef(new Set());
  const soundQueueRef = useRef(Promise.resolve());
  const previousStepRef = useRef('registration');
  const userMenuRef = useRef(null);

  const participants = useMemo(
    () => form.participantsText.split(/[\n,]/).map((p) => p.trim()).filter(Boolean),
    [form.participantsText]
  );

  const normalizeBlindLevels = useCallback((rawLevels) => {
    if (!Array.isArray(rawLevels) || rawLevels.length === 0) {
      return DEFAULT_BLIND_LEVELS.map((entry) => ({ ...entry }));
    }

    const normalized = [];
    rawLevels.forEach((entry) => {
      const itemType = entry?.itemType === 'BREAK' ? 'BREAK' : 'LEVEL';
      const durationMinutes = Number(entry?.durationMinutes || 20);

      if (itemType === 'BREAK') {
        normalized.push({
          itemType: 'BREAK',
          durationMinutes: durationMinutes > 0 ? durationMinutes : 10,
        });
      } else {
        const smallBlind = Number(entry?.smallBlind || 25);
        const bigBlind = Number(entry?.bigBlind || Math.max(50, smallBlind * 2));
        normalized.push({
          itemType: 'LEVEL',
          smallBlind,
          bigBlind,
          durationMinutes: durationMinutes > 0 ? durationMinutes : 20,
        });

        const legacyBreak = Number(entry?.breakMinutes || 0);
        if (legacyBreak > 0) {
          normalized.push({
            itemType: 'BREAK',
            durationMinutes: legacyBreak,
          });
        }
      }
    });

    return normalized;
  }, []);

  useEffect(() => () => {
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!soundManagerRef.current) {
      return;
    }
    soundManagerRef.current.setSettings({
      ...soundSettings,
      onNowPlayingChange: setCurrentSoundLabel,
    });
  }, [soundSettings]);

  useEffect(() => {
    if (!currentUser) {
      previousStepRef.current = step;
      return;
    }

    const sound = getSoundManager();
    const previousStep = previousStepRef.current;

    if (step === 'registration') {
      void sound.startBackgroundMusic(STEP_MUSIC_TRACKS.registration, {
        crossfadeMs: previousStep === 'preparation' ? AUDIO_TIMING_CONFIG.musicCrossfadeMs : 0,
        fadeInMs: previousStep === 'tournament' ? AUDIO_TIMING_CONFIG.musicFadeInMs : 0,
      });
    } else if (step === 'preparation') {
      void sound.startBackgroundMusic(STEP_MUSIC_TRACKS.preparation, {
        crossfadeMs: AUDIO_TIMING_CONFIG.musicCrossfadeMs,
      });
    } else if (step === 'tournament') {
      void sound.stopBackgroundMusic({ fadeOutMs: AUDIO_TIMING_CONFIG.tournamentFadeOutMs });
    }

    previousStepRef.current = step;
  }, [currentUser, step]);

  const clearProtectedState = () => {
    setStep('registration');
    setStatus(null);
    setDistribution([]);
    setMessage('');
    setSavedTemplateId(null);
    setActiveTablePopup(null);
    setUserMenuOpen(false);
    setSettingsOpen(false);
    scheduleSnapshotRef.current = null;
    playedCountdownSecondKeysRef.current.clear();
    soundQueueRef.current = Promise.resolve();
  };

  const enqueueSound = useCallback((task) => {
    soundQueueRef.current = soundQueueRef.current
      .then(() => task())
      .catch((error) => console.error(error));
    return soundQueueRef.current;
  }, []);

  const getSoundManager = () => {
    if (!soundManagerRef.current) {
      soundManagerRef.current = createSoundManager();
      soundManagerRef.current.setSettings({
        ...soundSettings,
        onNowPlayingChange: setCurrentSoundLabel,
      });
    }
    return soundManagerRef.current;
  };

  const clearAuthState = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken('');
    setCurrentUser(null);
    setSoundSettings({
      muted: false,
      beepVolume: 1,
      musicVolume: 0.22,
      speechEnabled: true,
      useSampleSounds: true,
      speechStyle: 'neutral',
      voicePreference: 'auto',
      seatShowEnabled: true,
      seatShowSpeed: 'normal',
      seatShowVoiceEnabled: true,
    });
    setCurrentSoundLabel('Kein Sound aktiv');
    setShowTournamentTables(true);
    clearProtectedState();
    setAuthChecked(true);
  };

  const showAuthPopup = (text) => new Promise((resolve) => {
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }

    setAuthPopup(text);
    authTimeoutRef.current = setTimeout(() => {
      setAuthPopup('');
      authTimeoutRef.current = null;
      resolve();
    }, getRandomDelayMs());
  });

  const apiFetch = async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (authToken) {
      headers.set('X-Auth-Token', authToken);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      clearAuthState();
      throw new Error('UNAUTHORIZED');
    }

    return response;
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      if (!authToken) {
        setAuthChecked(true);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'X-Auth-Token': authToken },
        });

        if (!response.ok) {
          throw new Error('UNAUTHORIZED');
        }

        const user = await response.json();
        if (!cancelled) {
          setCurrentUser(user);
        }
      } catch (error) {
        if (!cancelled) {
          clearAuthState();
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    loadLatestTemplate();
    fetchStatus();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || step !== 'tournament') {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      fetchStatus();
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [currentUser, step]);

  const fetchStatus = async () => {
    try {
      const response = await apiFetch('/api/status');
      if (!response.ok) {
        return;
      }
      const json = await response.json();
      setStatus(json);
      if (Array.isArray(json?.distribution)) {
        setDistribution(json.distribution);
      }

      const statusText = String(json?.status || '');
      const isRunning = Boolean(json?.running) && statusText === 'Turnier läuft';
      const hasValidTimeline = Boolean(json?.currentBlind) && json?.nextItem && json.nextItem !== '—';
      const remainingSeconds = Number(json?.remainingSeconds);
      const previousSnapshot = scheduleSnapshotRef.current;

      if (!isRunning || !hasValidTimeline || !Number.isFinite(remainingSeconds)) {
        scheduleSnapshotRef.current = {
          currentBlind: json?.currentBlind || null,
          status: statusText,
          remainingSeconds,
        };
        playedCountdownSecondKeysRef.current.clear();
        return;
      }

      if (remainingSeconds >= 2 && remainingSeconds <= 5) {
        const secondKey = `${json.currentBlind}|${json.nextItem}|${remainingSeconds}`;
        if (!playedCountdownSecondKeysRef.current.has(secondKey)) {
          playedCountdownSecondKeysRef.current.add(secondKey);
          void enqueueSound(async () => {
            const sound = getSoundManager();
            await sound.playBeep();
          });
        }
      }

      if (previousSnapshot && previousSnapshot.currentBlind !== json.currentBlind) {
        playedCountdownSecondKeysRef.current.clear();
        void enqueueSound(async () => {
          const sound = getSoundManager();
          await sound.playTransitionHighBeep();

          if (String(json.currentBlind).toLowerCase() === 'break') {
            const breakMinutes = Math.max(1, Math.round((Number(json.remainingSeconds) || 0) / 60));
            await sound.speakBreakStart(breakMinutes);
          } else {
            await sound.speakBlindLevel(json.currentBlind);
          }
        });
      }

      scheduleSnapshotRef.current = {
        currentBlind: json.currentBlind,
        status: statusText,
        remainingSeconds,
      };
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        console.error(error);
      }
    }
  };

  const loadLatestTemplate = async () => {
    try {
      const response = await apiFetch('/api/registration/templates/latest');
      if (response.status === 204 || !response.ok) {
        return;
      }
      const json = await response.json();
      applyTemplateToForm(json);
      setSavedTemplateId(json.id);
      setMessage('Letzte Registrierungsvorlage wurde geladen.');
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        console.error(error);
      }
    }
  };

  const applyTemplateToForm = (template) => {
    const participantText = (template.participants || []).join('\n');
    setForm({
      tournamentName: template.tournamentName || '',
      location: template.location || '',
      startingStack: template.startingStack || 10000,
      buyInEuro: template.buyInEuro ?? '',
      rebuyEnabled: template.rebuyEnabled ?? false,
      rebuyMode: template.rebuyMode || 'ONE_PER_PLAYER',
      rebuyMaxCount: template.rebuyMaxCount ?? 1,
      reentryPriceEuro: template.reentryPriceEuro ?? '',
      reentryStack: template.reentryStack ?? template.startingStack ?? 10000,
      tableCount: template.tableCount || 2,
      seatsPerTable: template.seatsPerTable || 8,
      hasNeutralDealer: template.hasNeutralDealer ?? false,
      participantsText: participantText,
      blindLevels: normalizeBlindLevels(template.blindLevels),
    });
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateBlindLevel = (index, field, value) => {
    setForm((prev) => {
      const next = [...prev.blindLevels];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, blindLevels: next };
    });
  };

  const addBlindLevel = () => {
    setForm((prev) => {
      const lastLevel = [...prev.blindLevels].reverse().find((entry) => entry.itemType !== 'BREAK') || DEFAULT_BLIND_LEVELS[0];
      const newLevel = {
        itemType: 'LEVEL',
        smallBlind: Number(lastLevel.smallBlind) * 2,
        bigBlind: Number(lastLevel.bigBlind) * 2,
        durationMinutes: Number(lastLevel.durationMinutes) || 20,
      };
      return { ...prev, blindLevels: [...prev.blindLevels, newLevel] };
    });
  };

  const addBreakLevel = () => {
    setForm((prev) => ({
      ...prev,
      blindLevels: [...prev.blindLevels, { itemType: 'BREAK', durationMinutes: 10 }],
    }));
  };

  const insertBlindLevelAt = (index) => {
    setForm((prev) => {
      const anchor = prev.blindLevels[Math.max(0, index - 1)] || DEFAULT_BLIND_LEVELS[0];
      const refLevel = anchor.itemType === 'LEVEL'
        ? anchor
        : [...prev.blindLevels.slice(0, index)].reverse().find((entry) => entry.itemType === 'LEVEL') || DEFAULT_BLIND_LEVELS[0];
      const row = {
        itemType: 'LEVEL',
        smallBlind: Number(refLevel.smallBlind) * 2,
        bigBlind: Number(refLevel.bigBlind) * 2,
        durationMinutes: Number(refLevel.durationMinutes) || 20,
      };
      const next = [...prev.blindLevels];
      next.splice(index, 0, row);
      return { ...prev, blindLevels: next };
    });
  };

  const insertBreakAt = (index) => {
    setForm((prev) => {
      const next = [...prev.blindLevels];
      next.splice(index, 0, { itemType: 'BREAK', durationMinutes: 10 });
      return { ...prev, blindLevels: next };
    });
  };

  const moveBlindLevel = (fromIndex, toIndex) => {
    setForm((prev) => {
      if (
        fromIndex === toIndex
        || fromIndex < 0
        || toIndex < 0
        || fromIndex >= prev.blindLevels.length
        || toIndex >= prev.blindLevels.length
      ) {
        return prev;
      }

      const next = [...prev.blindLevels];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...prev, blindLevels: next };
    });
  };

  const removeBlindLevel = (index) => {
    setForm((prev) => {
      if (prev.blindLevels.length <= 1) {
        return prev;
      }
      const next = prev.blindLevels.filter((_, idx) => idx !== index);
      return { ...prev, blindLevels: next };
    });
  };

  const resetBlindDefaults = () => {
    setForm((prev) => ({ ...prev, blindLevels: DEFAULT_BLIND_LEVELS.map((entry) => ({ ...entry })) }));
    setMessage('Standardstruktur mit Blindstufen und Pause wurde geladen.');
  };

  const buildRequest = () => ({
    tournamentName: form.tournamentName,
    location: form.location,
    startingStack: Number(form.startingStack),
    buyInEuro: form.buyInEuro === '' ? null : Number(form.buyInEuro),
    rebuyEnabled: form.rebuyEnabled,
    rebuyMode: form.rebuyEnabled ? form.rebuyMode : null,
    rebuyMaxCount: form.rebuyEnabled && form.rebuyMode === 'N_WHILE_ALL_ELIGIBLE' ? Number(form.rebuyMaxCount) : null,
    reentryPriceEuro: form.rebuyEnabled ? Number(form.reentryPriceEuro || 0) : null,
    reentryStack: form.rebuyEnabled ? Number(form.reentryStack || form.startingStack) : null,
    tableCount: Number(form.tableCount),
    seatsPerTable: Number(form.seatsPerTable),
    hasNeutralDealer: form.hasNeutralDealer,
    participants,
    blindLevels: form.blindLevels.map((level, index) => ({
      level: index + 1,
      itemType: level.itemType === 'BREAK' ? 'BREAK' : 'LEVEL',
      smallBlind: level.itemType === 'BREAK' ? null : Number(level.smallBlind),
      bigBlind: level.itemType === 'BREAK' ? null : Number(level.bigBlind),
      durationMinutes: Number(level.durationMinutes),
      breakMinutes: 0,
    })),
  });

  const validateForm = () => {
    if (!form.tournamentName.trim()) {
      return 'Bitte einen Turniernamen angeben.';
    }
    if (!form.location.trim()) {
      return 'Bitte einen Spielort angeben.';
    }
    if (participants.length < 2) {
      return 'Es werden mindestens zwei Teilnehmer benötigt.';
    }
    const levelsOnly = form.blindLevels.filter((level) => level.itemType !== 'BREAK');
    if (levelsOnly.length === 0) {
      return 'Mindestens eine echte Blindstufe ist erforderlich.';
    }
    if (form.blindLevels.some((level) => Number(level.durationMinutes) <= 0)) {
      return 'Jede Zeile muss eine Dauer > 0 Minuten haben.';
    }
    if (levelsOnly.some((level) => Number(level.smallBlind) >= Number(level.bigBlind))) {
      return 'Small Blind muss in jeder Stufe kleiner als Big Blind sein.';
    }
    return null;
  };

  const saveTemplate = async () => {
    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      return null;
    }

    try {
      const response = await apiFetch('/api/registration/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequest()),
      });

      if (!response.ok) {
        setMessage('Speichern der Registrierung fehlgeschlagen.');
        return null;
      }

      const saved = await response.json();
      setSavedTemplateId(saved.id);
      setMessage('Registrierungsdaten wurden gespeichert.');
      return saved;
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        console.error(error);
        setMessage('Backend ist nicht erreichbar. Bitte Verbindung prüfen.');
      }
      return null;
    }
  };

  const rotatePlayersFromIndex = (players, startIndex) => ([
    ...players.slice(startIndex),
    ...players.slice(0, startIndex),
  ]);

  const createDistribution = (players, tableCount, hasNeutralDealer) => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const tables = Array.from({ length: tableCount }, (_, idx) => ({
      tableName: `Tisch ${idx + 1}`,
      players: [],
      neutralDealer: hasNeutralDealer,
      dealer: null,
      smallBlind: null,
      bigBlind: null,
    }));

    shuffled.forEach((player, idx) => {
      tables[idx % tableCount].players.push(player);
    });

    return tables.map((table) => {
      if (table.players.length < 2) {
        return table;
      }

      const startIndex = Math.floor(Math.random() * table.players.length);
      const orderedPlayers = rotatePlayersFromIndex(table.players, startIndex);

      if (hasNeutralDealer) {
        return {
          ...table,
          players: orderedPlayers,
          dealer: null,
          smallBlind: orderedPlayers[0],
          bigBlind: orderedPlayers[1],
        };
      }

      return {
        ...table,
        players: orderedPlayers,
        dealer: orderedPlayers[0],
        smallBlind: orderedPlayers[1],
        bigBlind: orderedPlayers[2 % orderedPlayers.length],
      };
    });
  };

  const createTournament = async () => {
    const saved = await saveTemplate();
    const templateId = saved?.id || savedTemplateId;
    if (!templateId) {
      return;
    }

    try {
      const response = await apiFetch(`/api/registration/templates/${templateId}/create-tournament`, {
        method: 'POST',
      });

      if (!response.ok) {
        setMessage('Turnier konnte nicht angelegt werden.');
        return;
      }

      const seating = createDistribution(participants, Number(form.tableCount), form.hasNeutralDealer);
      setDistribution(seating);
      setStep('preparation');
      setActiveTablePopup(null);
      setMessage('');
      fetchStatus();
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        console.error(error);
        setMessage('Backend ist nicht erreichbar. Bitte Verbindung prüfen.');
      }
    }
  };

  const exportTemplate = async () => {
    if (!savedTemplateId) {
      setMessage('Bitte zuerst speichern, bevor exportiert wird.');
      return;
    }

    try {
      const response = await apiFetch(`/api/registration/templates/${savedTemplateId}/export`);
      if (!response.ok) {
        setMessage('Export fehlgeschlagen.');
        return;
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `registration-template-${savedTemplateId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage('JSON wurde exportiert.');
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        console.error(error);
      }
    }
  };

  const triggerImport = () => {
    importInputRef.current?.click();
  };

  const importTemplate = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const response = await apiFetch('/api/registration/templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setMessage('Import fehlgeschlagen.');
        return;
      }
      const saved = await response.json();
      applyTemplateToForm(saved);
      setSavedTemplateId(saved.id);
      setMessage('JSON erfolgreich importiert.');
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        console.error(error);
        setMessage('Die JSON-Datei ist ungültig.');
      }
    }
  };

  const startTournament = async () => {
    setCreateTournamentConfirmOpen(true);
  };

  const confirmStartTournament = async () => {
    setCreateTournamentConfirmOpen(false);
    setStep('tournament');
    setMessage('');
    await fetchStatus();
  };

  const shuffleUpAndDeal = async () => {
    try {
      const sound = getSoundManager();
      await sound.playBlindStageTransition();
      await Promise.all([
        resumeTournament(),
        sound.speak('Shuffle Up and Deal', { lang: 'en-US' }),
      ]);
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        console.error(error);
      }
    }
  };

  const requestBackToConfiguration = () => {
    setAbortTournamentConfirmOpen(true);
  };

  const confirmBackToConfiguration = async () => {
    if (status?.status !== 'Turnier beendet') {
      await endTournament();
    }
    setAbortTournamentConfirmOpen(false);
    setStep('registration');
    setMessage('Turnier wurde abgebrochen.');
    await fetchStatus();
  };

  const runTournamentAction = async (endpoint, payload = null) => {
    if (tournamentActionBusy) {
      return false;
    }

    setTournamentActionBusy(true);
    try {
      const options = payload
        ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
        : { method: 'POST' };

      const response = await apiFetch(endpoint, options);
      if (!response.ok) {
        return false;
      }
      await fetchStatus();
      return true;
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        console.error(error);
      }
      return false;
    } finally {
      setTournamentActionBusy(false);
    }
  };

  const pauseTournament = async () => runTournamentAction('/api/pause');
  const resumeTournament = async () => runTournamentAction('/api/resume');
  const endTournament = async () => runTournamentAction('/api/end');
  const markSeatOpen = async (playerName) => runTournamentAction('/api/seat-open', { playerName });
  const markSeatOpenWithSound = async (playerName) => {
    const success = await markSeatOpen(playerName);
    if (!success) {
      return false;
    }

    try {
      const sound = getSoundManager();
      await sound.playOneShot(SEAT_OPEN_SOUND, 'Seat Open Sound');
    } catch (error) {
      console.error(error);
    }

    return true;
  };
  const addRebuy = async (playerName) => runTournamentAction('/api/rebuy', { playerName });
  const balanceTables = async () => runTournamentAction('/api/table/balance');
  const createFinalTable = async () => runTournamentAction('/api/table/final-table');

  const saveTournamentResult = async (payload) => {
    const response = await apiFetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('SAVE_RESULT_FAILED');
    }

    return response.json();
  };

  const handleLogout = async () => {
    try {
      if (authToken) {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      }
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        console.error(error);
      }
    } finally {
      clearAuthState();
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (authBusy) {
      return;
    }

    setAuthBusy(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });

      if (!response.ok) {
        await showAuthPopup('Busted!');
        setLoginUsername('');
        setLoginPassword('');
        return;
      }

      const data = await response.json();
      await showAuthPopup('Sicher, dass ihr nicht Black Jack spielen wollt?');
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setCurrentUser({ username: data.username, role: data.role });
      setLoginUsername('');
      setLoginPassword('');
      setStep('registration');
      setMessage('');
    } catch (error) {
      console.error(error);
      await showAuthPopup('Busted!');
      setLoginUsername('');
      setLoginPassword('');
    } finally {
      setAuthBusy(false);
    }
  };

  const runSoundDemo = async () => {
    if (soundBusy) {
      return;
    }

    setSoundBusy(true);
    try {
      const sound = getSoundManager();
      await sound.runDemo();
    } catch (error) {
      console.error(error);
      setMessage('Audio-Demo konnte nicht abgespielt werden.');
    } finally {
      setSoundBusy(false);
    }
  };

  const handleSeatShowBefore = useCallback(async ({ playerName }) => {
    if (!soundSettings.seatShowVoiceEnabled) {
      return;
    }
    try {
      const sound = getSoundManager();
      await sound.speak(`Next player is ${playerName}`, { lang: 'en-US' });
    } catch (error) {
      console.error(error);
    }
  }, [soundSettings]);

  const handleSeatShowAfter = useCallback(async ({ tableNumber, seatNumber, playerName, roles }) => {
    try {
      const sound = getSoundManager();
      if (soundSettings.seatShowVoiceEnabled) {
        await sound.announceSeatPlacement({ tableNumber, seatNumber, playerName, roles });
      }

      const exactName = String(playerName || '').trim();
      const mapping = specialSeatSounds.find((entry) => entry.name === exactName);
      if (mapping?.sound) {
        await sound.playOneShot(mapping.sound, `Spezialsound: ${exactName}`);
      }
    } catch (error) {
      console.error(error);
    }
  }, [soundSettings]);

  const handleSeatShowComplete = useCallback(async () => {
    if (!soundSettings.seatShowVoiceEnabled) {
      return;
    }
    try {
      const sound = getSoundManager();
      await sound.speak('Please take your seats, the tournament will begin shortly!', { lang: 'en-US' });
    } catch (error) {
      console.error(error);
    }
  }, [soundSettings]);

  const openSettings = () => {
    setUserMenuOpen(false);
    setSettingsOpen(true);
  };

  const heroTitle = step === 'preparation'
    ? 'Tischverteilung - bitte Plätze einnehmen'
    : step === 'tournament'
      ? 'Turnier läuft - viel Erfolg'
      : 'Turnier anlegen und vorbereiten';

  if (!authChecked) {
    return (
      <div className="app-shell loading-shell">
        <section className="card loading-card">
          <p>Anmeldung wird geprüft...</p>
        </section>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        {authPopup && <div className="auth-popup">{authPopup}</div>}
        <LoginPage
          username={loginUsername}
          password={loginPassword}
          onUsernameChange={setLoginUsername}
          onPasswordChange={setLoginPassword}
          onSubmit={handleLogin}
          isBusy={authBusy}
        />
      </>
    );
  }

  return (
    <div className="app-shell">
      {authPopup && <div className="auth-popup">{authPopup}</div>}

      <header className="hero">
        <div>
          <p className="kicker">All Inners - PokerClock</p>
          <h1>{heroTitle}</h1>
        </div>
        <div className="hero-side">
          <div className="hero-chips">♠ ♥ ♦ ♣</div>
          <div className="hero-user-menu" ref={userMenuRef}>
            <button
              type="button"
              className="user-pill user-pill-button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
            >
              <strong>{currentUser.username}</strong>
              <span>{currentUser.role}</span>
            </button>

            {userMenuOpen && (
              <div className="user-menu-dropdown">
                <button type="button" className="ghost-button" onClick={openSettings}>Settings</button>
                <button type="button" className="ghost-button" onClick={handleLogout}>Abmelden</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {settingsOpen && (
        <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
          <section className="card settings-card" onClick={(event) => event.stopPropagation()}>
            <div className="settings-head">
              <h2>Settings</h2>
              <p>Sound-Steuerung für die aktuelle Session von {currentUser.username}.</p>
            </div>

            <div className="settings-group">
              <h3 className="settings-group-title">Sound</h3>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={soundSettings.muted}
                  onChange={(event) => setSoundSettings((prev) => ({ ...prev, muted: event.target.checked }))}
                />
                Alle Sounds stummschalten
              </label>

              <label>
                Beep-Lautstärke: {Math.round(soundSettings.beepVolume * 100)}%
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={soundSettings.beepVolume}
                  onChange={(event) => setSoundSettings((prev) => ({ ...prev, beepVolume: Number(event.target.value) }))}
                />
              </label>

              <label>
                Musik-Lautstärke: {Math.round((soundSettings.musicVolume ?? 0.22) * 100)}%
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={soundSettings.musicVolume ?? 0.22}
                  onChange={(event) => setSoundSettings((prev) => ({ ...prev, musicVolume: Number(event.target.value) }))}
                />
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={soundSettings.speechEnabled}
                  onChange={(event) => setSoundSettings((prev) => ({ ...prev, speechEnabled: event.target.checked }))}
                />
                Sprachansagen aktivieren
              </label>

              <label>
                Sprechstil
                <select
                  value={soundSettings.speechStyle}
                  onChange={(event) => setSoundSettings((prev) => ({ ...prev, speechStyle: event.target.value }))}
                >
                  <option value="neutral">Neutral</option>
                  <option value="commentator">Kommentator</option>
                </select>
              </label>

              <label>
                Stimme
                <select
                  value={soundSettings.voicePreference}
                  onChange={(event) => setSoundSettings((prev) => ({ ...prev, voicePreference: event.target.value }))}
                >
                  <option value="auto">Automatisch (Systemstandard)</option>
                  <option value="female">Weiblich (wenn verfügbar)</option>
                  <option value="male">Männlich (wenn verfügbar)</option>
                </select>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={soundSettings.seatShowVoiceEnabled}
                  onChange={(event) => setSoundSettings((prev) => ({ ...prev, seatShowVoiceEnabled: event.target.checked }))}
                />
                Seat-Show Sprachansagen aktivieren
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={soundSettings.useSampleSounds}
                  onChange={(event) => setSoundSettings((prev) => ({ ...prev, useSampleSounds: event.target.checked }))}
                />
                Reale Audio-Samples bevorzugen (/sounds)
              </label>

              <p className="settings-note">Dateien: /sounds/beep.wav, /sounds/beep-high.wav, /sounds/fanfare.wav</p>
              <p className="settings-now-playing"><strong>Aktuell abgespielt:</strong> {currentSoundLabel}</p>

              <div className="settings-group-actions">
                <button type="button" className="ghost-button" onClick={runSoundDemo} disabled={soundBusy}>
                  {soundBusy ? 'Sound-Demo läuft...' : 'Sound-Demo starten'}
                </button>
              </div>
            </div>

            <div className="settings-group">
              <h3 className="settings-group-title">Anzeige</h3>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={soundSettings.seatShowEnabled}
                  onChange={(event) => setSoundSettings((prev) => ({ ...prev, seatShowEnabled: event.target.checked }))}
                />
                Cinematic Seat-Show in Tischverteilung
              </label>

              <label>
                Seat-Show Geschwindigkeit
                <select
                  value={soundSettings.seatShowSpeed}
                  onChange={(event) => setSoundSettings((prev) => ({ ...prev, seatShowSpeed: event.target.value }))}
                >
                  <option value="slow">Langsam</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Schnell</option>
                </select>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={showTournamentTables}
                  onChange={(event) => setShowTournamentTables(event.target.checked)}
                />
                Tischmanagement im Turnier anzeigen
              </label>
            </div>

            <div className="settings-group">
              <h3 className="settings-group-title">Name → Sound-Verknüpfungen</h3>
              <p className="settings-note">Wird ein Spieler mit exakt diesem Namen bei der Tischverteilung platziert, spielt der gewählte Sound nach der Ansage ab.</p>

              {specialSeatSounds.length > 0 && (
                <table className="sound-mapping-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Sound</th>
                      <th>Test</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {specialSeatSounds.map((entry, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="text"
                            className="sound-mapping-name-input"
                            value={entry.name}
                            onChange={(event) => {
                              const updated = specialSeatSounds.map((item, i) =>
                                i === index ? { ...item, name: event.target.value } : item
                              );
                              setSpecialSeatSounds(updated);
                            }}
                          />
                        </td>
                        <td>
                          <select
                            className="sound-mapping-select"
                            value={entry.sound}
                            onChange={(event) => {
                              const updated = specialSeatSounds.map((item, i) =>
                                i === index ? { ...item, sound: event.target.value } : item
                              );
                              setSpecialSeatSounds(updated);
                            }}
                          >
                            {AVAILABLE_SOUND_FILES.map((file) => (
                              <option key={file} value={`/sounds/${file}`}>{file}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ghost-button ghost-button--small"
                            onClick={() => {
                              const sound = getSoundManager();
                              void sound.playOneShot(entry.sound, `Vorschau: ${entry.name}`);
                            }}
                          >▶</button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ghost-button ghost-button--small ghost-button--danger"
                            onClick={() => setSpecialSeatSounds((prev) => prev.filter((_, i) => i !== index))}
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="sound-mapping-add-row">
                <input
                  type="text"
                  className="sound-mapping-name-input"
                  placeholder="Name"
                  value={newMappingName}
                  onChange={(event) => setNewMappingName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && newMappingName.trim()) {
                      setSpecialSeatSounds((prev) => [...prev, { name: newMappingName.trim(), sound: newMappingSound }]);
                      setNewMappingName('');
                    }
                  }}
                />
                <select
                  className="sound-mapping-select"
                  value={newMappingSound}
                  onChange={(event) => setNewMappingSound(event.target.value)}
                >
                  {AVAILABLE_SOUND_FILES.map((file) => (
                    <option key={file} value={`/sounds/${file}`}>{file}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={!newMappingName.trim()}
                  onClick={() => {
                    setSpecialSeatSounds((prev) => [...prev, { name: newMappingName.trim(), sound: newMappingSound }]);
                    setNewMappingName('');
                  }}
                >+ Hinzufügen</button>
              </div>

              <div className="settings-group-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setSpecialSeatSounds(DEFAULT_SPECIAL_SEAT_SOUNDS)}
                >Zurücksetzen</button>
              </div>
            </div>

            <div className="settings-actions">
              <button type="button" className="primary-button" onClick={() => setSettingsOpen(false)}>Schließen</button>
            </div>
          </section>
        </div>
      )}

      {message && step !== 'tournament' && <div className="message-banner">{message}</div>}

      {step === 'registration' && (
        <RegistrationPage
          form={form}
          updateForm={updateForm}
          updateBlindLevel={updateBlindLevel}
          addBlindLevel={addBlindLevel}
          addBreakLevel={addBreakLevel}
          insertBlindLevelAt={insertBlindLevelAt}
          insertBreakAt={insertBreakAt}
          moveBlindLevel={moveBlindLevel}
          removeBlindLevel={removeBlindLevel}
          resetBlindDefaults={resetBlindDefaults}
          participants={participants}
          importInputRef={importInputRef}
          saveTemplate={saveTemplate}
          createTournament={createTournament}
          exportTemplate={exportTemplate}
          triggerImport={triggerImport}
          importTemplate={importTemplate}
        />
      )}

      {step === 'preparation' && (
        <PreparationPage
          distribution={distribution}
          activeTablePopup={activeTablePopup}
          setActiveTablePopup={setActiveTablePopup}
          setStep={setStep}
          startTournament={startTournament}
          seatShowSettings={{
            enabled: soundSettings.seatShowEnabled,
            speed: soundSettings.seatShowSpeed,
          }}
          onSeatShowBefore={handleSeatShowBefore}
          onSeatShowAfter={handleSeatShowAfter}
          onSeatShowComplete={handleSeatShowComplete}
        />
      )}

      {step === 'tournament' && (
        <TournamentPage
          status={status}
          distribution={distribution}
          tournamentConfig={{
            tournamentName: form.tournamentName,
            location: form.location,
            buyInEuro: form.buyInEuro,
            reentryPriceEuro: form.reentryPriceEuro,
            participants,
          }}
          setStep={setStep}
          pauseTournament={pauseTournament}
          resumeTournament={resumeTournament}
          endTournament={endTournament}
          markSeatOpen={markSeatOpenWithSound}
          addRebuy={addRebuy}
          balanceTables={balanceTables}
          createFinalTable={createFinalTable}
          showTableManagement={showTournamentTables}
          saveTournamentResult={saveTournamentResult}
          actionBusy={tournamentActionBusy}
          shuffleUpAndDeal={shuffleUpAndDeal}
          requestBackToConfiguration={requestBackToConfiguration}
        />
      )}

      {createTournamentConfirmOpen && (
        <div className="settings-overlay" onClick={() => setCreateTournamentConfirmOpen(false)}>
          <section className="card settings-card" onClick={(event) => event.stopPropagation()}>
            <h2>Turnier kann beginnen?</h2>
            <p>Nach der Bestätigung wird nur auf die Turnierseite gewechselt. Es wird noch kein Sound abgespielt und die Uhr startet noch nicht.</p>
            <div className="settings-actions">
              <button type="button" className="ghost-button" onClick={() => setCreateTournamentConfirmOpen(false)}>Abbrechen</button>
              <button type="button" className="primary-button" onClick={confirmStartTournament}>Ja, zur Turnierseite</button>
            </div>
          </section>
        </div>
      )}

      {abortTournamentConfirmOpen && (
        <div className="settings-overlay" onClick={() => setAbortTournamentConfirmOpen(false)}>
          <section className="card settings-card" onClick={(event) => event.stopPropagation()}>
            <h2>Zurück zur Konfiguration?</h2>
            <p>Wenn du zur Konfiguration zurückgehst, wird das aktuelle Turnier abgebrochen.</p>
            <div className="settings-actions">
              <button type="button" className="ghost-button" onClick={() => setAbortTournamentConfirmOpen(false)}>Abbrechen</button>
              <button type="button" className="danger-button" onClick={confirmBackToConfiguration}>Ja, Turnier abbrechen</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
