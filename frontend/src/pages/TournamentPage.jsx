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

function toAmount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.round((numeric + Number.EPSILON) * 100) / 100);
}

function formatCurrency(value) {
  return `${toAmount(value).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
}

function buildRowsFromPercentages(percentages, prizePool, withPlayers = false, players = []) {
  return percentages.map((percentage, index) => ({
    id: `${withPlayers ? 'deal' : 'place'}-${index + 1}`,
    place: index + 1,
    label: withPlayers ? `Deal ${index + 1}` : `${index + 1}. Platz`,
    playerName: withPlayers ? (players[index] || '') : '',
    percent: toAmount(percentage),
    amount: toAmount((toAmount(percentage) / 100) * prizePool),
  }));
}

function buildDynamicPercentages(count) {
  const safeCount = Math.max(2, Number(count || 2));
  const denominator = (safeCount * (safeCount + 1)) / 2;
  const values = Array.from({ length: safeCount }, (_, index) => {
    const weight = safeCount - index;
    return toAmount((weight / denominator) * 100);
  });
  const delta = toAmount(100 - values.reduce((sum, value) => sum + value, 0));
  values[values.length - 1] = toAmount(values[values.length - 1] + delta);
  return values;
}

export default function TournamentPage({
  status,
  distribution,
  tournamentConfig,
  setStep,
  pauseTournament,
  resumeTournament,
  endTournament,
  markSeatOpen,
  addRebuy,
  balanceTables,
  createFinalTable,
  showTableManagement = true,
  saveTournamentResult,
  actionBusy,
  shuffleUpAndDeal,
  requestBackToConfiguration,
}) {
  const statusText = status?.status || 'Turnier bereit';
  const isPaused = statusText === 'Turnier pausiert';
  const isRunning = statusText === 'Turnier läuft';
  const isEnded = statusText === 'Turnier beendet';
  const isReady = statusText === 'Turnier bereit';
  const heroClockText = formatClock(status?.remainingSeconds);
  const [activeTablePopup, setActiveTablePopup] = useState(null);
  const [selectedSeatAction, setSelectedSeatAction] = useState(null);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [payoutMode, setPayoutMode] = useState('preset2');
  const [payoutValueMode, setPayoutValueMode] = useState('percent');
  const [dynamicPlaceCount, setDynamicPlaceCount] = useState(4);
  const [payoutRows, setPayoutRows] = useState([]);
  const [persistResult, setPersistResult] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [summaryMessage, setSummaryMessage] = useState('');

  const buyInEuro = toAmount(tournamentConfig?.buyInEuro);
  const reentryPriceEuro = toAmount(tournamentConfig?.reentryPriceEuro);
  const prizePool = toAmount((buyInEuro * Number(status?.entries || 0)) + (reentryPriceEuro * Number(status?.rebuys || 0)));
  const hasPrizePool = prizePool > 0;
  const activePlayers = status?.activePlayerNames || [];
  const eliminatedPlayersInOrder = status?.eliminatedPlayerNames || [];
  const seatsPerTable = Number(status?.seatsPerTable || tournamentConfig?.seatsPerTable || 0);
  const finalTableEligible = Number(status?.playersLeft || 0) > 1 && Number(status?.playersLeft || 0) <= seatsPerTable;

  const allPlayers = useMemo(() => {
    const unique = new Set();
    const ordered = [];
    [...(status?.activePlayerNames || []), ...(status?.eliminatedPlayerNames || [])].forEach((name) => {
      if (!name || unique.has(name)) {
        return;
      }
      unique.add(name);
      ordered.push(name);
    });
    return ordered;
  }, [status]);

  const maxPlaces = Math.max(2, allPlayers.length || Number(status?.entries || 0) || 2);

  const suggestPlayersForPlaces = (count) => {
    const safeCount = Math.max(1, Number(count || 1));
    const suggestions = [];

    if (activePlayers.length > 0) {
      suggestions.push(activePlayers[0]);
    }

    const eliminatedReverse = [...eliminatedPlayersInOrder].reverse();
    eliminatedReverse.forEach((name) => {
      if (suggestions.length < safeCount) {
        suggestions.push(name);
      }
    });

    activePlayers.slice(1).forEach((name) => {
      if (suggestions.length < safeCount) {
        suggestions.push(name);
      }
    });

    while (suggestions.length < safeCount) {
      suggestions.push('');
    }

    return suggestions.slice(0, safeCount);
  };

  const withSuggestedPlayers = (rows) => {
    const suggestions = suggestPlayersForPlaces(rows.length);
    return rows.map((row, index) => ({
      ...row,
      playerName: suggestions[index] || '',
    }));
  };

  const createRowsForMode = (mode, dynamicCount = dynamicPlaceCount) => {
    if (!hasPrizePool) {
      return [];
    }

    if (mode === 'preset2') {
      return withSuggestedPlayers(buildRowsFromPercentages([60, 40], prizePool));
    }

    if (mode === 'preset3') {
      return withSuggestedPlayers(buildRowsFromPercentages([50, 30, 20], prizePool));
    }

    if (mode === 'dynamic') {
      return withSuggestedPlayers(buildRowsFromPercentages(buildDynamicPercentages(dynamicCount), prizePool));
    }

    if (mode === 'deal') {
      const count = Math.max(2, Math.min(maxPlaces, Number(status?.playersLeft || 2)));
      const baseSplit = Array.from({ length: count }, () => toAmount(100 / count));
      const delta = toAmount(100 - baseSplit.reduce((sum, value) => sum + value, 0));
      baseSplit[baseSplit.length - 1] = toAmount(baseSplit[baseSplit.length - 1] + delta);
      return withSuggestedPlayers(buildRowsFromPercentages(baseSplit, prizePool, true, allPlayers));
    }

    return withSuggestedPlayers(buildRowsFromPercentages([100], prizePool));
  };

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
    if (showTableManagement) {
      return;
    }
    setSelectedSeatAction(null);
  }, [showTableManagement]);

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
    setSummaryMessage('');
    setEndConfirmOpen(true);
  };

  const handleConfirmEnd = async () => {
    const success = await endTournament();
    if (!success) {
      setSummaryMessage('Turnier konnte nicht beendet werden. Bitte erneut versuchen.');
      setEndConfirmOpen(false);
      return;
    }

    const defaultMode = Number(status?.playersLeft || 0) >= 3 ? 'preset3' : 'preset2';
    const defaultDynamic = Math.max(2, Math.min(maxPlaces, Number(status?.playersLeft || 4) || 4));

    setPayoutMode(defaultMode);
    setPayoutValueMode('percent');
    setDynamicPlaceCount(defaultDynamic);
    setPayoutRows(createRowsForMode(defaultMode, defaultDynamic));
    setPersistResult(false);
    setSummaryMessage('');
    setEndConfirmOpen(false);
    setSummaryOpen(true);
  };

  const handlePayoutModeChange = (nextMode) => {
    setPayoutMode(nextMode);
    setPayoutRows(createRowsForMode(nextMode));
  };

  const handleValueModeChange = (nextMode) => {
    setPayoutValueMode(nextMode);
    if (!hasPrizePool) {
      return;
    }

    if (nextMode === 'amount') {
      setPayoutRows((prev) => prev.map((row) => ({
        ...row,
        amount: toAmount((toAmount(row.percent) / 100) * prizePool),
      })));
      return;
    }

    setPayoutRows((prev) => prev.map((row) => ({
      ...row,
      percent: prizePool > 0 ? toAmount((toAmount(row.amount) / prizePool) * 100) : 0,
    })));
  };

  const handlePayoutRowChange = (rowId, field, rawValue) => {
    setPayoutRows((prev) => prev.map((row) => {
      if (row.id !== rowId) {
        return row;
      }

      if (field === 'playerName') {
        return { ...row, playerName: rawValue };
      }

      const value = toAmount(rawValue);
      if (field === 'percent') {
        return {
          ...row,
          percent: value,
          amount: toAmount((value / 100) * prizePool),
        };
      }

      return {
        ...row,
        amount: value,
        percent: prizePool > 0 ? toAmount((value / prizePool) * 100) : 0,
      };
    }));
  };

  const addPayoutRow = () => {
    setPayoutRows((prev) => ([
      ...prev,
      {
        id: `${payoutMode}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        place: prev.length + 1,
        label: payoutMode === 'deal' ? `Deal ${prev.length + 1}` : `${prev.length + 1}. Platz`,
        playerName: allPlayers.find((name) => !prev.some((row) => row.playerName === name)) || '',
        percent: 0,
        amount: 0,
      },
    ]));
  };

  const removePayoutRow = (rowId) => {
    setPayoutRows((prev) => prev
      .filter((row) => row.id !== rowId)
      .map((row, index) => ({
        ...row,
        place: index + 1,
        label: payoutMode === 'deal' ? `Deal ${index + 1}` : `${index + 1}. Platz`,
      })));
  };

  const totals = useMemo(() => {
    const percent = toAmount(payoutRows.reduce((sum, row) => sum + toAmount(row.percent), 0));
    const amount = toAmount(payoutRows.reduce((sum, row) => sum + toAmount(row.amount), 0));
    return { percent, amount };
  }, [payoutRows]);

  const duplicateSelectedPlayers = useMemo(() => {
    const counts = new Map();
    payoutRows.forEach((row) => {
      if (!row.playerName) {
        return;
      }
      counts.set(row.playerName, (counts.get(row.playerName) || 0) + 1);
    });
    return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
  }, [payoutRows]);

  const payoutValid = useMemo(() => {
    if (!hasPrizePool) {
      return true;
    }

    if (!payoutRows.length) {
      return false;
    }

    const hasEmptyPlayer = payoutRows.some((row) => !row.playerName);
    if (hasEmptyPlayer || duplicateSelectedPlayers.length > 0) {
      return false;
    }

    if (payoutValueMode === 'percent') {
      return Math.abs(totals.percent - 100) <= 0.01;
    }

    return Math.abs(totals.amount - prizePool) <= 0.01;
  }, [duplicateSelectedPlayers, hasPrizePool, payoutRows, payoutValueMode, prizePool, totals.amount, totals.percent]);

  const handleBackToConfiguration = async () => {
    setSummaryMessage('');

    if (!persistResult) {
      setSummaryOpen(false);
      setStep('registration');
      return;
    }

    if (!payoutValid) {
      setSummaryMessage('Bitte Auszahlungen korrigieren (Summe 100% bzw. Gesamtbetrag, Spieler-Auswahl vollständig und ohne Duplikate).');
      return;
    }

    setSaveBusy(true);
    try {
      await saveTournamentResult({
        tournamentName: status?.tournamentName || tournamentConfig?.tournamentName || '',
        location: tournamentConfig?.location || '',
        entries: Number(status?.entries || 0),
        rebuys: Number(status?.rebuys || 0),
        playersLeft: Number(status?.playersLeft || 0),
        elapsedSeconds: Number(status?.elapsedSeconds || 0),
        buyInEuro: buyInEuro > 0 ? buyInEuro : null,
        reentryPriceEuro: reentryPriceEuro > 0 ? reentryPriceEuro : null,
        prizePoolEuro: hasPrizePool ? prizePool : null,
        payoutMode,
        payoutValueMode,
        participants: tournamentConfig?.participants || [],
        activePlayerNames: status?.activePlayerNames || [],
        eliminatedPlayerNames: status?.eliminatedPlayerNames || [],
        payouts: hasPrizePool
          ? payoutRows.map((row, index) => ({
            place: index + 1,
            label: row.label,
            playerName: row.playerName || null,
            percent: toAmount(row.percent),
            amountEuro: toAmount(row.amount),
          }))
          : [],
      });
      setSummaryOpen(false);
      setStep('registration');
    } catch (error) {
      setSummaryMessage('Ergebnis konnte nicht gespeichert werden. Bitte erneut versuchen oder ohne Speichern fortfahren.');
    } finally {
      setSaveBusy(false);
    }
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

          {showTableManagement && (
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
                showRoleMarkers={false}
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
          )}
        </>
      ) : (
        <p>Kein Status verfügbar.</p>
      )}

      <div className={styles.controlBar}>
        {isReady ? (
          <>
            {shuffleUpAndDeal && <button type="button" className="primary-button" onClick={shuffleUpAndDeal} disabled={actionBusy}>Shuffle Up and Deal</button>}
            <button type="button" className="ghost-button" onClick={requestBackToConfiguration} disabled={actionBusy}>Zurück zur Konfiguration</button>
          </>
        ) : (
          <>
            <button type="button" className="ghost-button" onClick={pauseTournament} disabled={actionBusy || !isRunning}>Turnier pausieren</button>
            <button type="button" className="ghost-button" onClick={resumeTournament} disabled={actionBusy || isEnded || isRunning}>Turnier fortsetzen</button>
            {showTableManagement && <button type="button" className="ghost-button" onClick={balanceTables} disabled={actionBusy || !isPaused || isEnded}>Tische ausgleichen</button>}
            {showTableManagement && <button type="button" className="ghost-button" onClick={createFinalTable} disabled={actionBusy || !isPaused || isEnded || !finalTableEligible}>Final Table erstellen</button>}
            <button type="button" className="danger-button" onClick={handleEndClick} disabled={actionBusy || isEnded}>Turnier beenden</button>
            <button type="button" className="ghost-button" onClick={requestBackToConfiguration} disabled={actionBusy || (!isPaused && !isEnded)}>Zurück zur Konfiguration</button>
          </>
        )}
      </div>

      {endConfirmOpen && (
        <div className="settings-overlay" onClick={() => setEndConfirmOpen(false)}>
          <section className={`card settings-card ${styles.endConfirmCard}`} onClick={(event) => event.stopPropagation()}>
            <h2>Turnier wirklich beenden?</h2>
            <p>Nach der Bestätigung wird das Turnier beendet und die Zusammenfassung angezeigt.</p>
            <div className="settings-actions">
              <button type="button" className="ghost-button" onClick={() => setEndConfirmOpen(false)} disabled={actionBusy}>Abbrechen</button>
              <button type="button" className="danger-button" onClick={handleConfirmEnd} disabled={actionBusy}>Ja, Turnier beenden</button>
            </div>
          </section>
        </div>
      )}

      {summaryOpen && (
        <div className="settings-overlay">
          <section className={`card ${styles.summaryCard}`} onClick={(event) => event.stopPropagation()}>
            <div className={styles.summaryHeader}>
              <h2>Turnier-Zusammenfassung</h2>
              <p>{status?.tournamentName || 'Turnier'}</p>
            </div>

            <div className={styles.summaryStatsGrid}>
              <div><span>Dauer</span><strong>{formatDuration(status?.elapsedSeconds || 0)}</strong></div>
              <div><span>Entries</span><strong>{formatNumber(status?.entries)}</strong></div>
              <div><span>Rebuys</span><strong>{formatNumber(status?.rebuys)}</strong></div>
              <div><span>Spieler übrig</span><strong>{formatNumber(status?.playersLeft)}</strong></div>
              <div><span>Eliminierte</span><strong>{formatNumber((status?.eliminatedPlayerNames || []).length)}</strong></div>
              <div><span>Average Stack</span><strong>{status?.playersLeft > 0 ? formatNumber(status?.averageStack) : '—'}</strong></div>
            </div>

            <div className={styles.playersLine}>
              <strong>Aktive Spieler:</strong> {(status?.activePlayerNames || []).join(', ') || '—'}
            </div>
            <div className={styles.playersLine}>
              <strong>Ausgeschieden:</strong> {(status?.eliminatedPlayerNames || []).join(', ') || '—'}
            </div>

            {hasPrizePool ? (
              <section className={styles.payoutSection}>
                <div className={styles.payoutHead}>
                  <h3>Preispool & Auszahlungen</h3>
                  <p>
                    Buy-in: {formatCurrency(buyInEuro)} x {formatNumber(status?.entries)} + Rebuy: {formatCurrency(reentryPriceEuro)} x {formatNumber(status?.rebuys)} = <strong>{formatCurrency(prizePool)}</strong>
                  </p>
                </div>

                <div className={styles.payoutControls}>
                  <label>
                    Verteilung
                    <select value={payoutMode} onChange={(event) => handlePayoutModeChange(event.target.value)}>
                      <option value="preset2">1. Platz 60%, 2. Platz 40%</option>
                      <option value="preset3">1. Platz 50%, 2. Platz 30%, 3. Platz 20%</option>
                      <option value="dynamic">Top N (abgestuft)</option>
                      <option value="custom">Custom (Plätze)</option>
                      <option value="deal">Deal (Spielerbasiert)</option>
                    </select>
                  </label>

                  {(payoutMode === 'dynamic' || payoutMode === 'custom') && (
                    <label>
                      Plätze
                      <input
                        type="number"
                        min="2"
                        max={maxPlaces}
                        value={dynamicPlaceCount}
                        onChange={(event) => {
                          const next = Math.max(2, Math.min(maxPlaces, Number(event.target.value || 2)));
                          setDynamicPlaceCount(next);
                          if (payoutMode === 'dynamic') {
                            setPayoutRows(createRowsForMode('dynamic', next));
                          }
                        }}
                      />
                    </label>
                  )}

                  <label>
                    Eingabe-Modus
                    <select value={payoutValueMode} onChange={(event) => handleValueModeChange(event.target.value)}>
                      <option value="percent">Prozent</option>
                      <option value="amount">Betrag</option>
                    </select>
                  </label>
                </div>

                {(payoutMode === 'custom' || payoutMode === 'deal') && (
                  <div className={styles.payoutRowActions}>
                    <button type="button" className="ghost-button" onClick={addPayoutRow}>Zeile hinzufügen</button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        const count = Math.max(2, Math.min(maxPlaces, dynamicPlaceCount));
                        if (payoutMode === 'deal') {
                          setPayoutRows(createRowsForMode('deal', count));
                        } else {
                          const base = Array.from({ length: count }, () => toAmount(100 / count));
                          const delta = toAmount(100 - base.reduce((sum, value) => sum + value, 0));
                          base[base.length - 1] = toAmount(base[base.length - 1] + delta);
                          setPayoutRows(withSuggestedPlayers(buildRowsFromPercentages(base, prizePool)));
                        }
                      }}
                    >
                      Gleich verteilen
                    </button>
                  </div>
                )}

                <div className={styles.payoutTable}>
                  {payoutRows.map((row) => (
                    <div key={row.id} className={styles.payoutRow}>
                      <span>{row.label}</span>

                      <select value={row.playerName} onChange={(event) => handlePayoutRowChange(row.id, 'playerName', event.target.value)}>
                        <option value="">Spieler auswählen</option>
                        {allPlayers.map((playerName) => (
                          <option key={playerName} value={playerName}>{playerName}</option>
                        ))}
                      </select>

                      {payoutValueMode === 'percent' ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.percent}
                          onChange={(event) => handlePayoutRowChange(row.id, 'percent', event.target.value)}
                        />
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.amount}
                          onChange={(event) => handlePayoutRowChange(row.id, 'amount', event.target.value)}
                        />
                      )}

                      <span className={styles.payoutComputed}>
                        {payoutValueMode === 'percent'
                          ? `${toAmount(row.percent).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% = ${formatCurrency(row.amount)}`
                          : `${formatCurrency(row.amount)} = ${toAmount(row.percent).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
                      </span>

                      {(payoutMode === 'custom' || payoutMode === 'deal') && payoutRows.length > 1 && (
                        <button type="button" className="ghost-button" onClick={() => removePayoutRow(row.id)}>Entfernen</button>
                      )}
                    </div>
                  ))}
                </div>

                <div className={`${styles.payoutTotals} ${payoutValid ? styles.payoutValid : styles.payoutInvalid}`}>
                  <span>Summe: {totals.percent.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                  <span>Summe: {formatCurrency(totals.amount)}</span>
                  {!payoutValid && <strong>Verteilung ist noch nicht gültig.</strong>}
                  {duplicateSelectedPlayers.length > 0 && (
                    <strong>Auszahlung enthält doppelte Spieler: {duplicateSelectedPlayers.join(', ')}</strong>
                  )}
                </div>
              </section>
            ) : (
              <section className={styles.payoutSection}>
                <h3>Preispool & Auszahlungen</h3>
                <p>Keine Buy-in/Rebuy-Beträge vorhanden. Daher wird keine Auszahlung berechnet.</p>
              </section>
            )}

            <label className={styles.persistToggle}>
              <input
                type="checkbox"
                checked={persistResult}
                onChange={(event) => setPersistResult(event.target.checked)}
                disabled={saveBusy}
              />
              Ergebnis optional im Backend speichern (Konfiguration + Resultat)
            </label>

            {summaryMessage && <p className={styles.summaryMessage}>{summaryMessage}</p>}

            <div className="settings-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleBackToConfiguration}
                disabled={saveBusy || (persistResult && !payoutValid)}
              >
                {saveBusy ? 'Speichern...' : 'Zurück zur Konfiguration'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
