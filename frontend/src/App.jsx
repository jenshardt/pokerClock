import { useEffect, useMemo, useRef, useState } from 'react';
import { AUTH_TOKEN_KEY, getRandomDelayMs } from './api';
import { DEFAULT_BLIND_LEVELS, initialForm } from './constants';
import LoginPage from './pages/LoginPage';
import PreparationPage from './pages/PreparationPage';
import RegistrationPage from './pages/RegistrationPage';
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
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authPopup, setAuthPopup] = useState('');
  const importInputRef = useRef(null);
  const authTimeoutRef = useRef(null);

  const participants = useMemo(
    () => form.participantsText.split(/[\n,]/).map((p) => p.trim()).filter(Boolean),
    [form.participantsText]
  );

  useEffect(() => () => {
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }
  }, []);

  const clearProtectedState = () => {
    setStep('registration');
    setStatus(null);
    setDistribution([]);
    setMessage('');
    setSavedTemplateId(null);
    setActiveTablePopup(null);
  };

  const clearAuthState = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken('');
    setCurrentUser(null);
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

  const fetchStatus = async () => {
    try {
      const response = await apiFetch('/api/status');
      if (!response.ok) {
        return;
      }
      const json = await response.json();
      setStatus(json);
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
      blindLevels: (template.blindLevels && template.blindLevels.length > 0)
        ? template.blindLevels
        : DEFAULT_BLIND_LEVELS,
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
      const current = prev.blindLevels[prev.blindLevels.length - 1] || DEFAULT_BLIND_LEVELS[0];
      const newLevel = {
        level: prev.blindLevels.length + 1,
        smallBlind: Number(current.smallBlind) * 2,
        bigBlind: Number(current.bigBlind) * 2,
        durationMinutes: Number(current.durationMinutes) || 20,
        breakMinutes: 0,
      };
      return { ...prev, blindLevels: [...prev.blindLevels, newLevel] };
    });
  };

  const removeBlindLevel = (index) => {
    setForm((prev) => {
      if (prev.blindLevels.length <= 1) {
        return prev;
      }
      const next = prev.blindLevels.filter((_, idx) => idx !== index).map((level, idx) => ({
        ...level,
        level: idx + 1,
      }));
      return { ...prev, blindLevels: next };
    });
  };

  const resetBlindDefaults = () => {
    setForm((prev) => ({ ...prev, blindLevels: DEFAULT_BLIND_LEVELS }));
    setMessage('Standard-Blindstruktur 25/50 bis 200/400 wurde geladen.');
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
      smallBlind: Number(level.smallBlind),
      bigBlind: Number(level.bigBlind),
      durationMinutes: Number(level.durationMinutes),
      breakMinutes: Number(level.breakMinutes || 0),
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
    if (form.blindLevels.some((level) => Number(level.smallBlind) >= Number(level.bigBlind))) {
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
      setMessage('Tischverteilung durchgeführt - bitte die Plätze einnehmen');
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
    try {
      const response = await apiFetch('/api/start', { method: 'POST' });
      if (!response.ok) {
        setMessage('Turnierstart fehlgeschlagen.');
        return;
      }
      setStep('tournament');
      setMessage('Turnier läuft.');
      fetchStatus();
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        console.error(error);
      }
    }
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

  const heroTitle = step === 'preparation'
    ? 'Tunier beginnt gleich'
    : step === 'tournament'
      ? 'Turnier läuft'
      : 'Turnier vorbereiten';

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
          <div className="user-pill">
            <strong>{currentUser.username}</strong>
            <span>{currentUser.role}</span>
          </div>
          <button type="button" className="ghost-button" onClick={handleLogout}>Abmelden</button>
        </div>
      </header>

      {message && <div className="message-banner">{message}</div>}

      {step === 'registration' && (
        <RegistrationPage
          form={form}
          updateForm={updateForm}
          updateBlindLevel={updateBlindLevel}
          addBlindLevel={addBlindLevel}
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
        />
      )}

      {step === 'tournament' && (
        <TournamentPage
          status={status}
          setStep={setStep}
          fetchStatus={fetchStatus}
        />
      )}
    </div>
  );
}

export default App;
