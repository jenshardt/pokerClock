import { useEffect, useState } from 'react';

const defaultParticipants = 'Alice,Bob,Clara,David';

function App() {
  const [tournamentName, setTournamentName] = useState('Poker-Turnier');
  const [participants, setParticipants] = useState(defaultParticipants);
  const [tables, setTables] = useState(2);
  const [seats, setSeats] = useState(5);
  const [chips, setChips] = useState(5000);
  const [blindStructure, setBlindStructure] = useState('10/20,25/50,50/100');
  const [blindDurationSeconds, setBlindDurationSeconds] = useState(300);
  const [rebuyAllowed, setRebuyAllowed] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const submitSetup = async () => {
    const request = {
      tournamentName,
      participants: participants.split(',').map((name) => name.trim()).filter(Boolean),
      tableCount: Number(tables),
      seatsPerTable: Number(seats),
      startingChips: Number(chips),
      blindStructure,
      blindDurationSeconds: Number(blindDurationSeconds),
      rebuyAllowed,
    };

    const response = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (response.ok) {
      setMessage('Turnierkonfiguration gespeichert.');
      setStatus(await fetchStatus());
    } else {
      setMessage('Fehler beim Speichern der Konfiguration.');
    }
  };

  const startTournament = async () => {
    const response = await fetch('/api/start', { method: 'POST' });
    if (response.ok) {
      setMessage('Turnier gestartet.');
      setStatus(await fetchStatus());
    } else {
      setMessage('Fehler beim Starten des Turniers.');
    }
  };

  const fetchStatus = async () => {
    const res = await fetch('/api/status');
    return res.ok ? await res.json() : null;
  };

  return (
    <div className="app-container">
      <header>
        <h1>PokerClock</h1>
        <p>Ein erster Prototyp zur Turniersteuerung mit Spring Boot + React.</p>
      </header>

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
            <input type="number" value={tables} onChange={(e) => setTables(e.target.value)} />
          </label>
          <label>
            Plätze/Tisch
            <input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
          </label>
          <label>
            Startchips
            <input type="number" value={chips} onChange={(e) => setChips(e.target.value)} />
          </label>
        </div>
        <label>
          Blindstruktur
          <input value={blindStructure} onChange={(e) => setBlindStructure(e.target.value)} />
        </label>
        <label>
          Dauer je Blindstufe (Sekunden)
          <input type="number" value={blindDurationSeconds} onChange={(e) => setBlindDurationSeconds(e.target.value)} />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={rebuyAllowed} onChange={(e) => setRebuyAllowed(e.target.checked)} />
          Rebuys erlaubt
        </label>
        <div className="button-row">
          <button onClick={submitSetup}>Konfiguration speichern</button>
          <button onClick={startTournament}>Turnier starten</button>
        </div>
        {message && <div className="info-box">{message}</div>}
      </section>

      <section className="card status-card">
        <h2>Turnierstatus</h2>
        {status ? (
          <div className="status-grid">
            <div>
              <strong>Turnier</strong>
              <p>{status.tournamentName || '—'}</p>
            </div>
            <div>
              <strong>Aktuelle Blindstufe</strong>
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
          <p>Keine Turnierdaten vorhanden.</p>
        )}
      </section>
    </div>
  );
}

export default App;
