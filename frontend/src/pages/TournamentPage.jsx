import styles from './TournamentPage.module.css';

export default function TournamentPage({ status, setStep, fetchStatus }) {
  return (
    <section className="screen card">
      <div className="section-head">
        <h2>Turnierbildschirm</h2>
        <p>Live-Status der aktiven Blindstufe und Teilnehmerzahl.</p>
      </div>

      {status ? (
        <div className={styles.statusGrid}>
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
  );
}
