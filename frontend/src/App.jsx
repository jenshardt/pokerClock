import { useEffect, useState } from 'react';

const defaultParticipants = 'Alice,Bob,Clara,David';
const defaultBlindStructure = '10/20,25/50,50/100,100/200';

function App() {
  const [step, setStep] = useState('setup');
  const [tournamentName, setTournamentName] = useState('Poker-Turnier');
  const [participants, setParticipants] = useState(defaultParticipants);
  const [tables, setTables] = useState(2);
  const [seats, setSeats] = useState(5);
  const [chips, setChips] = useState(5000);
  const [blindStructure, setBlindStructure] = useState(defaultBlindStructure);
  const [blindDurationSeconds, setBlindDurationSeconds] = useState(300);
  const [rebuyAllowed, setRebuyAllowed] = useState(false);
  const [status, setStatus] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  const buildSetupRequest = () => ({
    tournamentName,
    participants: participants.split(',').map((name) => name.trim()).filter(Boolean),
    tableCount: Number(tables),
    seatsPerTable: Number(seats),
    startingChips: Number(chips),
    blindStructure,
    blindDurationSeconds: Number(blindDurationSeconds),
    rebuyAllowed,
  });

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const json = await res.json();
        setStatus(json);
        return json;
      }
    } catch (error) {
      console.error('Status-Abfrage fehlgeschlagen', error);
      setStatus(null);
    }
    return null;
  };

  const setupTournament = async () => {
    const request = buildSetupRequest();
    const response = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (response.ok) {
      setMessage('Turnierkonfiguration gespeichert.');
      setStep('distribution');
      setDistribution(createDistribution(request));
      setStatus(await fetchStatus());
    } else {
      setMessage('Fehler beim Speichern der Konfiguration.');
    }
  };

  const createDistribution = ({ participants, tableCount, seatsPerTable }) => {
    const players = [...participants];
    const tablesData = Array.from({ length: tableCount }, (_, index) => ({
      tableName: `Tisch ${index + 1}`,
      players: [],
    }));

    let tableIndex = 0;
    while (players.length > 0 && tableIndex < tablesData.length) {
      const nextPlayer = players.shift();
      tablesData[tableIndex].players.push(nextPlayer);
      tableIndex = (tableIndex + 1) % tablesData.length;
    }

    return tablesData;
  };

  const startTournament = async () => {
    const response = await fetch('/api/start', { method: 'POST' });
    if (response.ok) {
      setMessage('Turnier gestartet.');
      setStep('tournament');
      fetchStatus();
    } else {
      setMessage('Fehler beim Starten des Turniers.');
    }
  };

  const renderSetup = () => (
    <section className="card">
      <h2>Turnierkonfiguration</h2>
      <label>
        Turniername
        <input value={tournamentName} onChange={(e) => setTournamentName(e.target.value)} />
      </label>
      <label>
        Teilnehmer (Komma getrennt)
        <input value={participants} onChange={(e) => setParticipants(e.target.value)} />
      </label>
      <div className="grid">
        <label>
          Anzahl Tische
          <input type="number" min="1" value={tables} onChange={(e) => setTables(e.target.value)} />
        </label>
        <label>
          Plätze/Tisch
          <input type="number" min="1" value={seats} onChange={(e) => setSeats(e.target.value)} />
        </label>
        <label>
          Startchips
          <input type="number" min="1" value={chips} onChange={(e) => setChips(e.target.value)} />
        </label>
      </div>
      <label>
        Blindstruktur
        <input value={blindStructure} onChange={(e) => setBlindStructure(e.target.value)} />
      </label>
      <label>
        Dauer je Blindstufe (Sekunden)
        <input type="number" min="30" value={blindDurationSeconds} onChange={(e) => setBlindDurationSeconds(e.target.value)} />
      </label>
      <label className="checkbox">
        <input type="checkbox" checked={rebuyAllowed} onChange={(e) => setRebuyAllowed(e.target.checked)} />
        Rebuys erlaubt
      </label>
      <div className="button-row">
        <button onClick={setupTournament}>Zum Tischplan</button>
      </div>
      {message && <div className="info-box">{message}</div>}
    </section>
  );

  const renderDistribution = () => (
    <section className="card">
      <h2>Tischverteilung</h2>
      {distribution ? (
        <div className="distribution-grid">
          {distribution.map((table) => (
            <div key={table.tableName} className="distribution-table">
              <h3>{table.tableName}</h3>
              <ol>
                {table.players.map((player) => (
                  <li key={player}>{player}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : (
        <p>Keine Tischverteilung verfügbar.</p>
      )}
      <div className="button-row">
        <button onClick={() => setStep('setup')}>Zurück zur Konfiguration</button>
        <button onClick={startTournament}>Turnier starten</button>
      </div>
      {message && <div className="info-box">{message}</div>}
    </section>
  );

  const renderTournament = () => (
    <section className="card">
      <h2>Turnierbildschirm</h2>
      {status ? (
        <div className="status-grid">
          <div>
            <strong>Turnier</strong>
            <p>{status.tournamentName || '—'}</p>
          </div>
          <div>
            <strong>Blindstufe</strong>
            <p>{status.currentBlind || '—'}</p>
          </div>
          <div>
            <strong>Verbleibende Zeit</strong>
            <p>{status.remainingSeconds != null ? `${status.remainingSeconds}s` : '—'}</p>
          </div>
          <div>
            <strong>Nächste Phase</strong>
            <p>{status.nextPhase || '—'}</p>
          </div>
          <div>
            <strong>Teilnehmer</strong>
            <p>{status.activePlayers != null ? status.activePlayers : '—'}</p>
          </div>
          <div>
            <strong>Status</strong>
            <p>{status.running ? 'Läuft' : 'Bereit'}</p>
          </div>
        </div>
      ) : (
        <p>Kein Turnierstatus verfügbar.</p>
      )}
      <div className="button-row">
        <button onClick={() => setStep('distribution')}>Zurück zur Tischverteilung</button>
      </div>
    </section>
  );

  return (
    <div className="app-container">
      <header>
        <h1>PokerClock</h1>
        <p>Ein erster Prototyp zur Turniersteuerung mit Spring Boot + React.</p>
      </header>
      {step === 'setup' && renderSetup()}
      {step === 'distribution' && renderDistribution()}
      {step === 'tournament' && renderTournament()}
    </div>
  );
}

export default App;
