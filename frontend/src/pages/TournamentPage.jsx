import { useEffect, useMemo, useState } from 'react';
import TableDistributionBoard from '../components/TableDistributionBoard';
import styles from './TournamentPage.module.css';

function formatClock(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatMaybeDuration(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || Number(totalSeconds) < 0) {
    return '—';
  }
  return formatDuration(totalSeconds);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('de-DE');
}

export default function TournamentPage({
  status,
  distribution,
  setStep,
  pauseTournament,
  resumeTournament,
  endTournament,
  markSeatOpen,
  addRebuy,
  actionBusy,
}) {
  const statusText = status?.status || 'Turnier bereit';
  const isPaused = statusText === 'Turnier pausiert';
  const isRunning = statusText === 'Turnier läuft';
  const isEnded = statusText === 'Turnier beendet';
  const heroClockText = formatClock(status?.remainingSeconds);
  const [activeTablePopup, setActiveTablePopup] = useState(null);
  const [selectedSeatAction, setSelectedSeatAction] = useState(null);

  const seatStatuses = useMemo(() => {
    const map = {};
    (status?.activePlayerNames || []).forEach((name) => {
      map[name] = 'active';
    });
    (status?.eliminatedPlayerNames || []).forEach((name) => {
      map[name] = 'eliminated';
    });
    return map;
  }, [status]);

  useEffect(() => {
    if (!selectedSeatAction) {
      return;
    }
    const currentStatus = seatStatuses[selectedSeatAction.playerName];
    if (!currentStatus) {
      setSelectedSeatAction(null);
      return;
    }
    if (currentStatus !== selectedSeatAction.seatStatus) {
      setSelectedSeatAction((prev) => prev ? { ...prev, seatStatus: currentStatus } : null);
    }
  }, [seatStatuses, selectedSeatAction]);

  const handleEndClick = () => {
    const confirmed = window.confirm('Sicher das Turnier beenden?');
    if (!confirmed) {
      return;
    }
    endTournament();
  };

  const handleSeatSelect = ({ table, seat, seatIndex, seatStatus, roles }) => {
    setSelectedSeatAction({
      playerName: seat.player,
      tableName: table.tableName,
      seatNumber: seatIndex + 1,
      seatStatus,
      roles,
    });
  };

  const handleSeatOpen = async () => {
    if (!selectedSeatAction?.playerName) {
      return;
    }
    await markSeatOpen(selectedSeatAction.playerName);
    setSelectedSeatAction(null);
  };

  const handleRebuy = async () => {
    if (!selectedSeatAction?.playerName) {
      return;
    }
    await addRebuy(selectedSeatAction.playerName);
    setSelectedSeatAction(null);
  };

  return (
    <section className={`${styles.tournamentScreen} card`}>
      <div className={styles.topLine}>
        <div className={styles.levelLabel}>Level {status?.currentLevelNumber ?? '—'}</div>
        <div className={`${styles.statusBadge} ${isRunning ? styles.statusRunning : isPaused ? styles.statusPaused : styles.statusEnded}`}>
          {statusText}
        </div>
      </div>

      {status ? (
        <>
          <div className={styles.mainGrid}>
            <div className={styles.sidePanel}>
              <div className={styles.metricCard}>
                <h3 className={styles.panelHeading}>Zeit bis zur nächsten Pause</h3>
                <strong>{formatMaybeDuration(status.timeToNextBreakSeconds)}</strong>
              </div>
              <div className={styles.metricCard}>
                <h3 className={styles.panelHeading}>Turnierdauer</h3>
                <strong>{formatDuration(status.elapsedSeconds)}</strong>
              </div>
            </div>

            <div className={styles.centerPanel}>
              <div className={styles.centerTop}>
                <p className={styles.tournamentName}>{status.tournamentName || '—'}</p>
              </div>

              <div className={styles.centerClockLayer}>
                <div className={styles.heroTimeSlot}>
                  <div className={styles.heroTime}>{heroClockText}</div>
                </div>
              </div>

              <div className={styles.centerBottom}>
                <p className={styles.blindsLine}>
                  {status.currentSmallBlind && status.currentBigBlind
                    ? `SB ${formatNumber(status.currentSmallBlind)} / BB ${formatNumber(status.currentBigBlind)}`
                    : (status.currentBlind || '—')}
                </p>
                <p className={styles.nextLine}>Nächste Stufe: {status.nextItem || '—'}</p>
              </div>
            </div>

            <div className={styles.sidePanel}>
              <div className={styles.statsBlock}>
                <h3 className={styles.panelHeading}>Spieler</h3>
                <div className={styles.statRow}><span>Entries</span><strong>{formatNumber(status.entries)}</strong></div>
                <div className={styles.statRow}><span>Players Left</span><strong>{formatNumber(status.playersLeft)}</strong></div>
                <div className={styles.statRow}><span>Rebuys</span><strong>{formatNumber(status.rebuys)}</strong></div>
              </div>

              <div className={styles.statsBlock}>
                <h3 className={styles.panelHeading}>Chips</h3>
                <div className={styles.statRow}><span>Starting Stack</span><strong>{formatNumber(status.startingStack)}</strong></div>
                <div className={styles.statRow}><span>Total Chips</span><strong>{formatNumber(status.totalChips)}</strong></div>
                <div className={styles.statRow}><span>Average Stack</span><strong>{status.playersLeft > 0 ? formatNumber(status.averageStack) : '—'}</strong></div>
              </div>
            </div>
          </div>

          <section className={styles.tableBoardSection}>
            <div className={styles.tableBoardHead}>
              <h3 className={styles.panelHeading}>Tischplan</h3>
              <p>Klicke auf einen Platz, um Spieler als ausgeschieden zu markieren oder einen Rebuy auszuführen.</p>
            </div>

            <TableDistributionBoard
              distribution={distribution}
              activeTablePopup={activeTablePopup}
              setActiveTablePopup={setActiveTablePopup}
              seatStatuses={seatStatuses}
              onSeatSelect={handleSeatSelect}
              selectedPlayerName={selectedSeatAction?.playerName}
              compact
            />

            {selectedSeatAction && (
              <div className={styles.seatActionPanel}>
                <div className={styles.seatActionMeta}>
                  <strong>{selectedSeatAction.playerName}</strong>
                  <span>{selectedSeatAction.tableName}, Platz {selectedSeatAction.seatNumber}</span>
                </div>
                <div className={styles.seatActionButtons}>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleSeatOpen}
                    disabled={actionBusy || isEnded || selectedSeatAction.seatStatus !== 'active'}
                  >
                    Seat open
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleRebuy}
                    disabled={actionBusy || isEnded || selectedSeatAction.seatStatus !== 'eliminated'}
                  >
                    Rebuy
                  </button>
                  <button type="button" className="ghost-button" onClick={() => setSelectedSeatAction(null)} disabled={actionBusy}>Schließen</button>
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        <p>Kein Status verfügbar.</p>
      )}

      <div className={styles.controlBar}>
        <button type="button" className="ghost-button" onClick={pauseTournament} disabled={actionBusy || !isRunning}>Turnier pausieren</button>
        <button type="button" className="ghost-button" onClick={resumeTournament} disabled={actionBusy || isEnded || isRunning}>Turnier fortsetzen</button>
        <button type="button" className="danger-button" onClick={handleEndClick} disabled={actionBusy || isEnded}>Turnier beenden</button>
        <button type="button" className="ghost-button" onClick={() => setStep('registration')} disabled={actionBusy || (!isPaused && !isEnded)}>Zurück zur Konfiguration</button>
      </div>
    </section>
  );
}
