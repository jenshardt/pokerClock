import { useEffect, useMemo } from 'react';
import TableDistributionBoard, { getSeatLayouts, getSeatRoles } from '../components/TableDistributionBoard';

const SEAT_SEQUENCE_INTERVAL_MS = 5000;

export default function PreparationPage({
  distribution,
  activeTablePopup,
  setActiveTablePopup,
  setStep,
  startTournament,
  onSeatPlaced,
}) {
  const seatLayouts = useMemo(
    () => getSeatLayouts(distribution),
    [distribution]
  );

  const seatStartOffsets = useMemo(() => {
    let runningCount = 0;
    return seatLayouts.map((layout) => {
      const start = runningCount;
      runningCount += layout.length;
      return start;
    });
  }, [seatLayouts]);

  useEffect(() => {
    if (typeof onSeatPlaced !== 'function') {
      return undefined;
    }

    const timers = [];
    distribution.forEach((table, tableIndex) => {
      seatLayouts[tableIndex].forEach((seat, seatIndex) => {
        if (seat.isNeutralDealer) {
          return;
        }

        const { isDealerSeat, isSmallBlindSeat, isBigBlindSeat } = getSeatRoles(table, seat);
        const globalSeatIndex = seatStartOffsets[tableIndex] + seatIndex;
        const seatDelayMs = 240 + (globalSeatIndex * SEAT_SEQUENCE_INTERVAL_MS);

        const roles = [];
        if (isDealerSeat) {
          roles.push('dealer');
        }
        if (isSmallBlindSeat) {
          roles.push('small-blind');
        }
        if (isBigBlindSeat) {
          roles.push('big-blind');
        }

        const timerId = window.setTimeout(() => {
          onSeatPlaced({
            tableNumber: tableIndex + 1,
            seatNumber: seatIndex + 1,
            playerName: seat.player,
            roles,
          });
        }, seatDelayMs);

        timers.push(timerId);
      });
    });

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [distribution, onSeatPlaced, seatLayouts, seatStartOffsets]);

  return (
    <section className="screen card">
      <TableDistributionBoard
        distribution={distribution}
        activeTablePopup={activeTablePopup}
        setActiveTablePopup={setActiveTablePopup}
        animate
        sequenceIntervalMs={SEAT_SEQUENCE_INTERVAL_MS}
      />

      <div className="toolbar">
        <button type="button" className="ghost-button" onClick={() => setStep('registration')}>Zurück zur Tuniervorbereitung</button>
        <button type="button" className="primary-button" onClick={startTournament}>Turnier starten</button>
      </div>
    </section>
  );
}
