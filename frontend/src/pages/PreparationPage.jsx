import { useCallback, useMemo } from 'react';
import TableDistributionBoard, { getSeatLayouts } from '../components/TableDistributionBoard';
import useSeatShowSequence from '../hooks/useSeatShowSequence';
import styles from './PreparationPage.module.css';

export default function PreparationPage({
  distribution,
  activeTablePopup,
  setActiveTablePopup,
  setStep,
  startTournament,
  seatShowSettings,
  onSeatShowBefore,
  onSeatShowAfter,
  onSeatShowComplete,
}) {
  const showEnabled = Boolean(seatShowSettings?.enabled);
  const showSpeed = seatShowSettings?.speed || 'normal';

  const seatLayouts = useMemo(
    () => getSeatLayouts(distribution),
    [distribution]
  );

  const handleBeforeSeat = useCallback(async (entry) => {
    if (typeof onSeatShowBefore === 'function') {
      await onSeatShowBefore(entry);
    }
  }, [onSeatShowBefore]);

  const handleAfterSeat = useCallback(async (entry) => {
    if (typeof onSeatShowAfter === 'function') {
      await onSeatShowAfter(entry);
    }
  }, [onSeatShowAfter]);

  const handleComplete = useCallback(async (payload) => {
    if (typeof onSeatShowComplete === 'function') {
      await onSeatShowComplete(payload);
    }
  }, [onSeatShowComplete]);

  const {
    activeSeat,
    phase,
    isRunning,
    progress,
    placedSeatIds,
    speedProfile,
  } = useSeatShowSequence({
    distribution,
    enabled: showEnabled,
    speed: showSpeed,
    onBeforeSeat: handleBeforeSeat,
    onAfterSeat: handleAfterSeat,
    onComplete: handleComplete,
  });

  const seatStatuses = useMemo(() => {
    const map = {};
    distribution.forEach((table, tableIndex) => {
      seatLayouts[tableIndex].forEach((seat, seatIndex) => {
        if (seat.isNeutralDealer) {
          return;
        }
        const seatId = `${tableIndex}-${seatIndex}-${seat.player}`;
        map[seatId] = showEnabled && !placedSeatIds.has(seatId) ? 'pending' : 'active';
      });
    });
    return map;
  }, [distribution, seatLayouts, showEnabled, placedSeatIds]);

  const showSeatCard = useMemo(() => {
    if (!showEnabled || !activeSeat || (phase !== 'focus' && phase !== 'fly')) {
      return null;
    }

    const seat = seatLayouts[activeSeat.tableIndex]?.[activeSeat.seatIndex];
    if (!seat) {
      return null;
    }

    const tableCount = distribution.length;
    const isTwoColumnLayout = tableCount > 1;
    let originX = 50;
    let originY = 48;

    if (isTwoColumnLayout) {
      originX = activeSeat.tableIndex % 2 === 0 ? 132 : -32;
      originY = 50;
    }

    return {
      tableIndex: activeSeat.tableIndex,
      seatIndex: activeSeat.seatIndex,
      playerName: activeSeat.playerName,
      targetX: seat.x,
      targetY: seat.y,
      originX,
      originY,
      phase,
      flyDurationMs: speedProfile.flyMs,
    };
  }, [showEnabled, activeSeat, phase, seatLayouts, speedProfile.flyMs, distribution.length]);

  const progressText = showEnabled
    ? `Player presentation: ${progress.placed}/${progress.total}`
    : `Player distribution ready: ${progress.total}/${progress.total}`;

  return (
    <section className="screen card">
      <div className={styles.showHead}>
        <strong>{progressText}</strong>
        {showEnabled && (
          <span>{isRunning ? 'Preparing seats...' : 'Presentation finished'}</span>
        )}
      </div>

      <TableDistributionBoard
        distribution={distribution}
        activeTablePopup={activeTablePopup}
        setActiveTablePopup={setActiveTablePopup}
        seatStatuses={seatStatuses}
        showSeatCard={showSeatCard}
        animate={false}
        showRoleMarkers={!showEnabled || !isRunning}
      />

      <div className="toolbar">
        <button type="button" className="ghost-button" onClick={() => setStep('registration')}>Zurück zur Tunierkonfiguration</button>
        <button type="button" className="primary-button" onClick={startTournament}>Turnier kann beginnen</button>
      </div>
    </section>
  );
}
