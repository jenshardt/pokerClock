import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_BLIND_LEVELS, initialForm } from './constants';
import RegistrationPage from './pages/RegistrationPage';
import PreparationPage from './pages/PreparationPage';
import TournamentPage from './pages/TournamentPage';

function App() {
  const [step, setStep] = useState('registration');
  const [status, setStatus] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [message, setMessage] = useState('');
  const [activeTablePopup, setActiveTablePopup] = useState(null);
  const [savedTemplateId, setSavedTemplateId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const importInputRef = useRef(null);

  const participants = useMemo(
    () => form.participantsText.split(/[\n,]/).map((p) => p.trim()).filter(Boolean),
    [form.participantsText]
  );

  useEffect(() => {
    loadLatestTemplate();
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) {
        return;
      }
      const json = await response.json();
      setStatus(json);
    } catch (error) {
      console.error(error);
    }
  };

  const loadLatestTemplate = async () => {
    try {
      const response = await fetch('/api/registration/templates/latest');
      if (response.status === 204 || !response.ok) {
        return;
      }
      const json = await response.json();
      applyTemplateToForm(json);
      setSavedTemplateId(json.id);
      setMessage('Letzte Registrierungsvorlage wurde geladen.');
    } catch (error) {
      console.error(error);
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
      const response = await fetch('/api/registration/templates', {
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
      console.error(error);
      setMessage('Backend ist nicht erreichbar. Bitte Verbindung prüfen.');
      return null;
    }
  };

  const createTournament = async () => {
    const saved = await saveTemplate();
    const templateId = saved?.id || savedTemplateId;
    if (!templateId) {
      return;
    }

    try {
      const response = await fetch(`/api/registration/templates/${templateId}/create-tournament`, {
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
      console.error(error);
      setMessage('Backend ist nicht erreichbar. Bitte Verbindung prüfen.');
    }
  };

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
      if (hasNeutralDealer) {
        const sbIndex = Math.floor(Math.random() * table.players.length);
        const bbIndex = (sbIndex + 1) % table.players.length;
        return {
          ...table,
          dealer: null,
          smallBlind: table.players[sbIndex],
          bigBlind: table.players[bbIndex],
        };
      }
      const dealerIndex = Math.floor(Math.random() * table.players.length);
      const smallBlindIndex = (dealerIndex + 1) % table.players.length;
      const bigBlindIndex = (dealerIndex + 2) % table.players.length;
      return {
        ...table,
        dealer: table.players[dealerIndex],
        smallBlind: table.players[smallBlindIndex],
        bigBlind: table.players[bigBlindIndex],
      };
    });
  };

  const exportTemplate = async () => {
    if (!savedTemplateId) {
      setMessage('Bitte zuerst speichern, bevor exportiert wird.');
      return;
    }
    const response = await fetch(`/api/registration/templates/${savedTemplateId}/export`);
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
      const response = await fetch('/api/registration/templates/import', {
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
      console.error(error);
      setMessage('Die JSON-Datei ist ungültig.');
    }
  };

  const startTournament = async () => {
    const response = await fetch('/api/start', { method: 'POST' });
    if (!response.ok) {
      setMessage('Turnierstart fehlgeschlagen.');
      return;
    }
    setStep('tournament');
    setMessage('Turnier läuft.');
    fetchStatus();
  };

  const heroTitle = step === 'preparation'
    ? 'Tunier beginnt gleich'
    : step === 'tournament'
      ? 'Turnier läuft'
      : 'Turnier vorbereiten';

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="kicker">All Inners - PokerClock</p>
          <h1>{heroTitle}</h1>
        </div>
        <div className="hero-chips">♠ ♥ ♦ ♣</div>
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
