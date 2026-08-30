import { useEffect, useState } from 'react';
import TableDistributionBoard from '../components/TableDistributionBoard';
import styles from './TableDisplayPage.module.css';

const ALL_TABLES = 'ALL_TABLES';
const TABLE_SELECTION_KEY = 'pokerclock.tableDisplay.selection';

function formatClock(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('de-DE');
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TableDisplayPage({ status, distribution }) {
  const [selectedTable, setSelectedTable] = useState(() => localStorage.getItem(TABLE_SELECTION_KEY) || ALL_TABLES);
  const tableNames = distribution.map((table) => table.tableName);
  const isPreparation = status?.workflowPhase === 'PREPARATION';
  const isRegistration = status?.workflowPhase === 'REGISTRATION';
  const isAborted = status?.completionReason === 'ABORTED';
  const isEnded = status?.completionReason === 'COMPLETED';
  const payoutSummary = status?.payoutSummary || [];
  const seatStatuses = Object.fromEntries([
    ...(status?.activePlayerNames || []).map((playerName) => [playerName, 'active']),
    ...(status?.eliminatedPlayerNames || []).map((playerName) => [playerName, 'eliminated']),
  ]);
  const selectedDistribution = selectedTable === ALL_TABLES
    ? distribution
    : distribution.filter((table) => table.tableName === selectedTable);
  const selectedTableLabel = selectedTable === ALL_TABLES ? 'Alle Tische' : selectedTable;

  useEffect(() => {
    if (tableNames.length > 0 && selectedTable !== ALL_TABLES && !tableNames.includes(selectedTable)) {
      setSelectedTable(ALL_TABLES);
    }
  }, [selectedTable, tableNames]);

  const handleTableSelectionChange = (event) => {
    const nextSelection = event.target.value;
    localStorage.setItem(TABLE_SELECTION_KEY, nextSelection);
    setSelectedTable(nextSelection);
  };

  const tableSelector = (
    <label className={styles.tableSelect}>
      Tischansicht
      <select value={selectedTable} onChange={handleTableSelectionChange}>
        <option value={ALL_TABLES}>Alle Tische</option>
        {selectedTable !== ALL_TABLES && tableNames.length === 0 && <option value={selectedTable}>{selectedTable}</option>}
        {tableNames.map((tableName) => <option key={tableName} value={tableName}>{tableName}</option>)}
      </select>
    </label>
  );

  if (isAborted) {
    return <StatePage title="Turnier wurde abgebrochen" detail="Warte auf die nächste Turniervorbereitung." tableSelector={tableSelector} />;
  }

  if (isRegistration || !status || !status.tournamentName) {
    return <StatePage
      title={selectedTableLabel}
      detail="Turnier wird vorbereitet. Eine konkrete Tischverteilung erscheint nach der Anlage des Turniers."
      tableSelector={tableSelector}
    />;
  }

  if (isPreparation) {
    return (
      <main className={`${styles.tableDisplay} ${styles.preparationDisplay}`}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>PokerClock</p>
            <h1>{selectedTableLabel}</h1>
          </div>
          {tableSelector}
        </header>
        <section className={styles.preparationBoard}>
          <p>Turnier wird vorbereitet</p>
          <TableDistributionBoard
            distribution={selectedDistribution}
            showRoleMarkers
            animate
            compressed
            interactive={false}
          />
        </section>
      </main>
    );
  }

  return (
    <main className={styles.tableDisplay}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>PokerClock</p>
          <h1>{status.tournamentName || 'Turnier'}</h1>
        </div>
        {tableSelector}
      </header>

      <section className={styles.clockPanel}>
        <p className={styles.status}>{isEnded ? 'Turnier beendet' : status.status}</p>
        <strong className={styles.clock}>{isEnded ? formatClock(status.elapsedSeconds) : formatClock(status.remainingSeconds)}</strong>
        <p className={styles.blinds}>
          {status.currentSmallBlind && status.currentBigBlind
            ? `SB ${status.currentSmallBlind.toLocaleString('de-DE')} / BB ${status.currentBigBlind.toLocaleString('de-DE')}`
            : (status.currentBlind || '—')}
        </p>
        {!isEnded && <p className={styles.next}>Nächste Stufe: {status.nextItem || '—'}</p>}
      </section>

      <section className={styles.metrics}>
        <div><span>Zeit bis Pause</span><strong>{Number(status.timeToNextBreakSeconds) >= 0 ? formatDuration(status.timeToNextBreakSeconds) : '—'}</strong></div>
        <div><span>Turnierdauer</span><strong>{formatDuration(status.elapsedSeconds)}</strong></div>
        <div><span>Spieler</span><strong>{formatNumber(status.playersLeft)} / {formatNumber(status.entries)}</strong></div>
        <div><span>Rebuys</span><strong>{formatNumber(status.rebuys)}</strong></div>
        <div><span>Total Chips</span><strong>{formatNumber(status.totalChips)}</strong></div>
        <div><span>Average Stack</span><strong>{status.playersLeft > 0 ? formatNumber(status.averageStack) : '—'}</strong></div>
      </section>

      {isEnded ? (
        <section className={styles.completionPanel}>
          <h2>Turnier-Zusammenfassung</h2>
          <dl>
            <div><dt>Entries</dt><dd>{status.entries || 0}</dd></div>
            <div><dt>Rebuys</dt><dd>{status.rebuys || 0}</dd></div>
            <div><dt>Spieler übrig</dt><dd>{status.playersLeft || 0}</dd></div>
          </dl>
          {status.payoutSummaryEnabled && payoutSummary.length > 0 ? (
            <div className={styles.payoutSummary}>
              {payoutSummary.map((payout) => (
                <div key={`${payout.place}-${payout.playerName}`}>
                  <span>{payout.label || `${payout.place}. Platz`}</span>
                  <strong>{payout.playerName || '—'}</strong>
                  <span>{formatCurrency(payout.amountEuro)} EUR</span>
                </div>
              ))}
            </div>
          ) : (
            <p>{status.payoutSummaryEnabled ? 'Die Auszahlungsübersicht wurde noch nicht erfasst.' : 'Für dieses Turnier ist keine Auszahlungsübersicht vorgesehen.'}</p>
          )}
        </section>
      ) : selectedTable === ALL_TABLES ? (
        <section className={styles.tableOverview} aria-label="Tischübersicht">
          {distribution.map((table) => (
            <article key={table.tableName} className={styles.tableSummary}>
              <h2>{table.tableName}</h2>
              <p>{table.players.length} Spieler</p>
              <div className={styles.playerList}>
                {table.players.length > 0
                  ? table.players.map((playerName) => (
                    <span key={playerName} className={seatStatuses[playerName] === 'eliminated' ? styles.eliminatedPlayer : ''}>{playerName}</span>
                  ))
                  : 'Noch keine Plätze belegt'}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.singleTable}>
          <TableDistributionBoard distribution={selectedDistribution} seatStatuses={seatStatuses} showRoleMarkers={false} compact compressed interactive={false} />
        </section>
      )}
    </main>
  );
}

function StatePage({ title, detail, tableSelector }) {
  return (
    <main className={`${styles.tableDisplay} ${styles.statePage}`}>
      <section>
        <p className={styles.eyebrow}>PokerClock</p>
        <h1>{title}</h1>
        <p>{detail}</p>
        {tableSelector}
      </section>
    </main>
  );
}