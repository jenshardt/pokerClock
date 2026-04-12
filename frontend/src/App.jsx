import { useEffect, useMemo, useRef, useState } from 'react';

const REBUY_MODES = {
  ONE_PER_PLAYER: 'Jeder Spieler max. 1 Rebuy',
  ONE_WHILE_ALL_ELIGIBLE: 'Jeder Spieler max. 1 Rebuy, solange alle noch eligible sind',
  N_WHILE_ALL_ELIGIBLE: 'Jeder Spieler max. n Rebuys, solange alle noch eligible sind',
};

const DEFAULT_BLIND_LEVELS = [
  { level: 1, smallBlind: 25, bigBlind: 50, durationMinutes: 20, breakMinutes: 0 },
  { level: 2, smallBlind: 50, bigBlind: 100, durationMinutes: 20, breakMinutes: 0 },
  { level: 3, smallBlind: 100, bigBlind: 200, durationMinutes: 20, breakMinutes: 0 },
  { level: 4, smallBlind: 200, bigBlind: 400, durationMinutes: 20, breakMinutes: 10 },
];

const initialForm = {
  tournamentName: 'Friday Night Holdem',
  location: 'Vereinsheim Musterstadt',
  startingStack: 10000,
  buyInEuro: 20,
  rebuyEnabled: true,
  rebuyMode: 'ONE_PER_PLAYER',
  rebuyMaxCount: 1,
  reentryPriceEuro: 20,
  reentryStack: 10000,
  tableCount: 2,
  seatsPerTable: 8,
  participantsText: 'Alice\nBob\nChris\nDave\nEve\nFrank',
  blindLevels: DEFAULT_BLIND_LEVELS,
};

function App() {
  const [step, setStep] = useState('registration');
  const [status, setStatus] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [message, setMessage] = useState('');
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
  };

  const createTournament = async () => {
    const saved = await saveTemplate();
    const templateId = saved?.id || savedTemplateId;
    if (!templateId) {
      return;
    }

    const response = await fetch(`/api/registration/templates/${templateId}/create-tournament`, {
      method: 'POST',
    });

    if (!response.ok) {
      setMessage('Turnier konnte nicht angelegt werden.');
      return;
    }

    const seating = createDistribution(participants, Number(form.tableCount));
    setDistribution(seating);
    setStep('preparation');
    setMessage('Turnier angelegt. Verteilung ist bereit.');
    fetchStatus();
  };

  const createDistribution = (players, tableCount) => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const tables = Array.from({ length: tableCount }, (_, idx) => ({
      tableName: `Tisch ${idx + 1}`,
      players: [],
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

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="kicker">All Inners - PokerClock</p>
          <h1>Turnier vorbereiten</h1>
        </div>
        <div className="hero-chips">♠ ♥ ♦ ♣</div>
      </header>

      {message && <div className="message-banner">{message}</div>}

      {step === 'registration' && (
        <section className="screen card">
          <div className="section-head">
            <h2>Angaben zum Turnier</h2>
            <p className="section-hint">Alle Angaben können als Vorlage gespeichert und importiert/exportiert werden.</p>
          </div>

          <div className="group-grid">
            <article className="group-card">
              <h3>Turnierdaten</h3>
              <label>
                Turniername
                <input value={form.tournamentName} onChange={(e) => updateForm('tournamentName', e.target.value)} />
              </label>
              <label>
                Spielort
                <input value={form.location} onChange={(e) => updateForm('location', e.target.value)} />
              </label>
              <div className="inline-grid">
                <label>
                  Starting Stack
                  <input type="number" min="100" step="100" value={form.startingStack} onChange={(e) => updateForm('startingStack', e.target.value)} />
                </label>
                <label>
                  Buy In (EUR, optional)
                  <input type="number" min="0" step="0.5" value={form.buyInEuro} onChange={(e) => updateForm('buyInEuro', e.target.value)} />
                </label>
              </div>
              <div className="quick-picks">
                {[5000, 10000, 20000].map((stack) => (
                  <button key={stack} type="button" className="ghost-button" onClick={() => updateForm('startingStack', stack)}>
                    {stack.toLocaleString('de-DE')} Chips
                  </button>
                ))}
              </div>
            </article>

            <article className="group-card">
              <h3>Teilnehmer und Tische</h3>
              <label>
                Teilnehmer (eine Zeile pro Name oder komma-getrennt)
                <textarea value={form.participantsText} onChange={(e) => updateForm('participantsText', e.target.value)} rows={7} />
              </label>
              <div className="inline-grid">
                <label>
                  Anzahl Tische
                  <input type="number" min="1" max="20" value={form.tableCount} onChange={(e) => updateForm('tableCount', e.target.value)} />
                </label>
                <label>
                  Plätze pro Tisch
                  <input type="number" min="2" max="10" value={form.seatsPerTable} onChange={(e) => updateForm('seatsPerTable', e.target.value)} />
                </label>
              </div>
              <p className="hint">Aktuell erfasst: {participants.length} Spieler. Für Texas Holdem sind 2-10 Spieler je Tisch sinnvoll.</p>
            </article>
          </div>

          <article className="group-card">
            <h3>Rebuy-Regeln</h3>
            <label className="toggle-line">
              <input type="checkbox" checked={form.rebuyEnabled} onChange={(e) => updateForm('rebuyEnabled', e.target.checked)} />
              Rebuys erlauben
            </label>

            {form.rebuyEnabled && (
              <div className="rebuy-panel">
                {Object.entries(REBUY_MODES).map(([key, label]) => (
                  <label key={key} className="radio-line">
                    <input
                      type="radio"
                      checked={form.rebuyMode === key}
                      onChange={() => updateForm('rebuyMode', key)}
                    />
                    {label}
                  </label>
                ))}

                {form.rebuyMode === 'N_WHILE_ALL_ELIGIBLE' && (
                  <label>
                    Maximale Rebuys pro Spieler (n)
                    <input type="number" min="1" value={form.rebuyMaxCount} onChange={(e) => updateForm('rebuyMaxCount', e.target.value)} />
                  </label>
                )}

                <div className="inline-grid">
                  <label>
                    Reentry Price (EUR)
                    <input type="number" min="0" step="0.5" value={form.reentryPriceEuro} onChange={(e) => updateForm('reentryPriceEuro', e.target.value)} />
                  </label>
                  <label>
                    Reentry Stack
                    <input type="number" min="100" step="100" value={form.reentryStack} onChange={(e) => updateForm('reentryStack', e.target.value)} />
                  </label>
                </div>
                <button type="button" className="ghost-button" onClick={() => updateForm('reentryStack', form.startingStack)}>
                  Reentry Stack auf Starting Stack setzen
                </button>
              </div>
            )}
          </article>

          <article className="group-card">
            <div className="split-head">
              <h3>Blindstruktur</h3>
              <div className="button-row">
                <button type="button" className="ghost-button" onClick={resetBlindDefaults}>Standard 25/50 bis 200/400</button>
                <button type="button" className="ghost-button" onClick={addBlindLevel}>Level hinzufügen</button>
              </div>
            </div>
            <div className="blind-table-wrap">
              <table className="blind-table">
                <thead>
                  <tr>
                    <th>Level</th>
                    <th>Small Blind</th>
                    <th>Big Blind</th>
                    <th>Dauer (Min)</th>
                    <th>Pause danach (Min)</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {form.blindLevels.map((level, idx) => (
                    <tr key={`blind-${idx}`}>
                      <td>{idx + 1}</td>
                      <td><input type="number" min="1" value={level.smallBlind} onChange={(e) => updateBlindLevel(idx, 'smallBlind', e.target.value)} /></td>
                      <td><input type="number" min="2" value={level.bigBlind} onChange={(e) => updateBlindLevel(idx, 'bigBlind', e.target.value)} /></td>
                      <td><input type="number" min="1" value={level.durationMinutes} onChange={(e) => updateBlindLevel(idx, 'durationMinutes', e.target.value)} /></td>
                      <td><input type="number" min="0" value={level.breakMinutes || 0} onChange={(e) => updateBlindLevel(idx, 'breakMinutes', e.target.value)} /></td>
                      <td>
                        <button type="button" className="danger-button" onClick={() => removeBlindLevel(idx)}>Entfernen</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <div className="toolbar">
            <div className="button-row">
              <button type="button" className="ghost-button" onClick={saveTemplate}>Turnierstruktur speichern</button>
              <button type="button" className="ghost-button" onClick={exportTemplate}>Turnierstruktur exportieren</button>
              <button type="button" className="ghost-button" onClick={triggerImport}>Turnierstruktur importieren</button>
              <input ref={importInputRef} type="file" accept="application/json" onChange={importTemplate} hidden />
            </div>
            <button type="button" className="primary-button" onClick={createTournament}>Turnier anlegen</button>
          </div>
        </section>
      )}

      {step === 'preparation' && (
        <section className="screen card">
          <div className="section-head">
            <h2>Vorbereitung: Tischverteilung</h2>
            <p>Dealer, Small Blind und Big Blind werden pro Tisch initial gesetzt.</p>
          </div>

          <div className="distribution-grid">
            {distribution.map((table) => (
              <article key={table.tableName} className="distribution-card">
                <h3>{table.tableName}</h3>
                <ul>
                  {table.players.map((player) => (
                    <li key={`${table.tableName}-${player}`}>{player}</li>
                  ))}
                </ul>
                {table.dealer && (
                  <div className="roles">
                    <p><strong>Dealer:</strong> {table.dealer}</p>
                    <p><strong>Small Blind:</strong> {table.smallBlind}</p>
                    <p><strong>Big Blind:</strong> {table.bigBlind}</p>
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="toolbar">
            <button type="button" className="ghost-button" onClick={() => setStep('registration')}>Zurück zur Registrierung</button>
            <button type="button" className="primary-button" onClick={startTournament}>Turnier starten</button>
          </div>
        </section>
      )}

      {step === 'tournament' && (
        <section className="screen card">
          <div className="section-head">
            <h2>Turnierbildschirm</h2>
            <p>Live-Status der aktiven Blindstufe und Teilnehmerzahl.</p>
          </div>

          {status ? (
            <div className="status-grid">
              <div><strong>Turnier</strong><p>{status.tournamentName || '—'}</p></div>
              <div><strong>Blindstufe</strong><p>{status.currentBlind || '—'}</p></div>
              <div><strong>Verbleibende Zeit</strong><p>{status.remainingSeconds ?? 0}s</p></div>
              <div><strong>Nächste Phase</strong><p>{status.nextPhase || '—'}</p></div>
              <div><strong>Teilnehmer</strong><p>{status.activePlayers ?? 0}</p></div>
              <div><strong>Status</strong><p>{status.running ? 'Läuft' : 'Bereit'}</p></div>
            </div>
          ) : (
            <p>Kein Status verfügbar.</p>
          )}

          <div className="toolbar">
            <button type="button" className="ghost-button" onClick={() => setStep('preparation')}>Zurück zur Vorbereitung</button>
            <button type="button" className="ghost-button" onClick={fetchStatus}>Status aktualisieren</button>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
