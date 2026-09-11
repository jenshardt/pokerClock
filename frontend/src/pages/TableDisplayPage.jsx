import { useEffect, useRef, useState } from 'react';
import TableDistributionBoard from '../components/TableDistributionBoard';
import TournamentPage from './TournamentPage';
import styles from './TableDisplayPage.module.css';

const ALL_TABLES = 'ALL_TABLES';
const TABLE_SELECTION_KEY = 'pokerclock.tableDisplay.selection';
const SHOW_BOARD_KEY = 'pokerclock.tableDisplay.showBoard';

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

export default function TableDisplayPage({ status, distribution, currentUser, onLogout }) {
  const [selectedTable, setSelectedTable] = useState(() => localStorage.getItem(TABLE_SELECTION_KEY) || ALL_TABLES);
  const [showTableBoard, setShowTableBoard] = useState(() => localStorage.getItem(SHOW_BOARD_KEY) !== 'false');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const tableNames = distribution.map((table) => table.tableName);
  const isPreparation = status?.workflowPhase === 'PREPARATION';
  const isRegistration = status?.workflowPhase === 'REGISTRATION';
  const isAborted = status?.completionReason === 'ABORTED';
  const isEnded = status?.completionReason === 'COMPLETED';
  const payoutSummary = status?.payoutSummary || [];
  const selectedDistribution = selectedTable === ALL_TABLES
    ? distribution
    : distribution.filter((table) => table.tableName === selectedTable);
  const selectedTableLabel = selectedTable === ALL_TABLES ? 'Alle Tische' : selectedTable;

  useEffect(() => {
    if (tableNames.length > 0 && selectedTable !== ALL_TABLES && !tableNames.includes(selectedTable)) {
      setSelectedTable(ALL_TABLES);
    }
  }, [selectedTable, tableNames]);

  useEffect(() => {
    if (!userMenuOpen) {
      return undefined;
    }
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const handleTableSelectionChange = (event) => {
    const nextSelection = event.target.value;
    localStorage.setItem(TABLE_SELECTION_KEY, nextSelection);
    setSelectedTable(nextSelection);
  };

  const handleBoardToggle = (event) => {
    const next = event.target.checked;
    localStorage.setItem(SHOW_BOARD_KEY, String(next));
    setShowTableBoard(next);
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

  const headerMenu = (
    <div className="hero-user-menu" ref={userMenuRef}>
      <button
        type="button"
        className="user-pill user-pill-button"
        onClick={() => setUserMenuOpen((prev) => !prev)}
      >
        <strong>{currentUser?.username || 'Tisch'}</strong>
        <span>{currentUser?.role || 'TABLE'}</span>
      </button>

      {userMenuOpen && (
        <div className="user-menu-dropdown">
          <button type="button" className="ghost-button" onClick={() => { setUserMenuOpen(false); setSettingsOpen(true); }}>Settings</button>
          {onLogout && <button type="button" className="ghost-button" onClick={onLogout}>Abmelden</button>}
        </div>
      )}
    </div>
  );

  const settingsOverlay = settingsOpen ? (
    <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
      <section className="card settings-card" onClick={(event) => event.stopPropagation()}>
        <div className="settings-head">
          <h2>Settings</h2>
          <p>Anzeigeeinstellungen für diesen Tisch{currentUser ? ` (${currentUser.username})` : ''}.</p>
        </div>

        <div className="settings-group">
          <h3 className="settings-group-title">Anzeige</h3>
          {tableSelector}
          <label className="settings-toggle">
            <input type="checkbox" checked={showTableBoard} onChange={handleBoardToggle} />
            Tischplan anzeigen
          </label>
        </div>

        <div className="settings-actions">
          <button type="button" className="primary-button" onClick={() => setSettingsOpen(false)}>Schließen</button>
        </div>
      </section>
    </div>
  ) : null;

  if (isAborted) {
    return <StatePage title="Turnier wurde abgebrochen" detail="Warte auf die nächste Turniervorbereitung." actions={headerMenu} overlay={settingsOverlay} />;
  }

  if (isRegistration || !status || !status.tournamentName) {
    return <StatePage
      title={selectedTableLabel}
      detail="Turnier wird vorbereitet. Eine konkrete Tischverteilung erscheint nach der Anlage des Turniers."
      actions={headerMenu}
      overlay={settingsOverlay}
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
          {headerMenu}
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
        {settingsOverlay}
      </main>
    );
  }

  if (isEnded) {
    return (
      <main className={styles.tableDisplay}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>PokerClock</p>
            <h1>{status.tournamentName || 'Turnier'}</h1>
          </div>
          {headerMenu}
        </header>

        <section className={styles.clockPanel}>
          <p className={styles.status}>Turnier beendet</p>
          <strong className={styles.clock}>{formatClock(status.elapsedSeconds)}</strong>
          <p className={styles.blinds}>
            {status.currentSmallBlind && status.currentBigBlind
              ? `SB ${status.currentSmallBlind.toLocaleString('de-DE')} / BB ${status.currentBigBlind.toLocaleString('de-DE')}`
              : (status.currentBlind || '—')}
          </p>
        </section>

        <section className={styles.metrics}>
          <div><span>Zeit bis Pause</span><strong>{Number(status.timeToNextBreakSeconds) >= 0 ? formatDuration(status.timeToNextBreakSeconds) : '—'}</strong></div>
          <div><span>Turnierdauer</span><strong>{formatDuration(status.elapsedSeconds)}</strong></div>
          <div><span>Spieler</span><strong>{formatNumber(status.playersLeft)} / {formatNumber(status.entries)}</strong></div>
          <div><span>Rebuys</span><strong>{formatNumber(status.rebuys)}</strong></div>
          <div><span>Total Chips</span><strong>{formatNumber(status.totalChips)}</strong></div>
          <div><span>Average Stack</span><strong>{status.playersLeft > 0 ? formatNumber(status.averageStack) : '—'}</strong></div>
        </section>

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
        {settingsOverlay}
      </main>
    );
  }

  return (
    <main className={styles.embeddedDisplay}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>PokerClock</p>
          <h1>{selectedTableLabel}</h1>
        </div>
        {headerMenu}
      </header>

      <TournamentPage
        status={status}
        distribution={selectedDistribution}
        tournamentConfig={{}}
        showTableManagement={false}
        showTableBoard={showTableBoard}
        showControls={false}
        showCompletionSummary={false}
        canReturnToRegistration={false}
        actionBusy={false}
      />
      {settingsOverlay}
    </main>
  );
}

function StatePage({ title, detail, actions, overlay }) {
  return (
    <main className={`${styles.tableDisplay} ${styles.statePage}`}>
      <section>
        <p className={styles.eyebrow}>PokerClock</p>
        <h1>{title}</h1>
        <p>{detail}</p>
        {actions}
      </section>
      {overlay}
    </main>
  );
}